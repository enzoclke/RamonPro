import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { optimiserTournees } from './algo';
import { supabase } from './supabase';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const SECTEURS = {
  nord: {
    id: 'nord',
    label: '🔵 Secteur Nord',
    description: 'Châtillon / Aube / Marne',
    couleurs: ['#1E3A5F', '#2563EB', '#0EA5E9', '#06B6D4', '#0891B2'],
    centre: [47.9, 4.5],
    zoom: 7,
  },
  sud: {
    id: 'sud',
    label: '🟠 Secteur Sud',
    description: 'Dijon / Beaune / Côte d\'Or',
    couleurs: ['#E8720C', '#DC2626', '#16A34A', '#9333EA', '#CA8A04'],
    centre: [47.2, 4.9],
    zoom: 9,
  },
};

const POINTS_DEPART = [
  { id: 'chatillon', nom: 'Châtillon-sur-Seine', lat: 47.8588, lng: 4.5707 },
  { id: 'dijon', nom: 'Dijon', lat: 47.322, lng: 5.041 },
  { id: 'troyes', nom: 'Troyes', lat: 48.297, lng: 4.074 },
  { id: 'chaumont', nom: 'Chaumont', lat: 47.848, lng: 5.140 },
  { id: 'auxerre', nom: 'Auxerre', lat: 47.798, lng: 3.570 },
];

function detecterSecteur(lat) {
  return lat >= 47.6 ? 'nord' : 'sud';
}

function getLundiSemaine(offsetSemaines = 0) {
  const today = new Date();
  const lundi = new Date(today);
  lundi.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offsetSemaines * 7);
  lundi.setHours(0, 0, 0, 0);
  return lundi;
}

function formatSemaine(lundi) {
  const vendredi = new Date(lundi);
  vendredi.setDate(lundi.getDate() + 4);
  return `${lundi.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${vendredi.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

// Géocodage via Nominatim
async function geocoderAdresse(adresse) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(adresse + ', France')}&format=json&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {}
  return null;
}

function Carte({ tournees, jourSelectionne, depart }) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const tournee = tournees[jourSelectionne];

  React.useEffect(() => {
    if (!tournee || !depart) return;
    if (mapInstanceRef.current) mapInstanceRef.current.remove();

    const allLats = [depart.lat, ...tournee.clients.map(c => c.lat)];
    const allLngs = [depart.lng, ...tournee.clients.map(c => c.lng)];
    const cLat = allLats.reduce((a, b) => a + b, 0) / allLats.length;
    const cLng = allLngs.reduce((a, b) => a + b, 0) / allLngs.length;

    const map = L.map(mapRef.current, { zoomControl: false }).setView([cLat, cLng], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const iconDepart = L.divIcon({
      className: '',
      html: `<div style="background:#374151;width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:16px">🏠</div>`,
      iconSize: [34, 34], iconAnchor: [17, 17],
    });
    L.marker([depart.lat, depart.lng], { icon: iconDepart })
      .bindPopup(`<strong>Départ</strong><br>${depart.nom}`)
      .addTo(map);

    const positions = [[depart.lat, depart.lng], ...tournee.clients.map(c => [c.lat, c.lng])];
    L.polyline(positions, { color: tournee.couleur, weight: 4, dashArray: '8,6' }).addTo(map);

    tournee.clients.forEach((client, i) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${tournee.couleur};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px">${i + 1}</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      });
      L.marker([client.lat, client.lng], { icon })
        .bindPopup(`<strong>${i + 1}. ${client.nom}</strong><br>📍 ${client.adresse}<br>⏰ ${client.heureDebut} → ${client.heureFin}<br>🚗 ${client.trajetDepuis} min`)
        .addTo(map);
    });

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [tournee, depart]);

  return <div ref={mapRef} style={{ height: '300px', width: '100%' }} />;
}

// ============================================
// ASSISTANT PLANIFICATION
// ============================================
function AssistantPlanification({ secteur, onLancer, onCancel }) {
  const [etape, setEtape] = useState(1);
  const [semaine, setSemaine] = useState(0);
  const [depart, setDepart] = useState(POINTS_DEPART[0]);
  const [clientsSelectionnes, setClientsSelectionnes] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodage, setGeocodage] = useState(false);

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nom', { ascending: true });
      if (!error) setClients(data || []);
      setLoading(false);
    }
    charger();
  }, []);

  const clientsDuSecteur = clients.filter(c => {
    if (c.lat && c.lng) return detecterSecteur(c.lat) === secteur;
    return true; // si pas de coords, on les inclut quand même
  });

  const clientsFiltres = clientsDuSecteur.filter(c =>
    `${c.nom} ${c.prenom} ${c.adresse}`.toLowerCase().includes(recherche.toLowerCase())
  );

  const lundi = getLundiSemaine(semaine);

  function toggleClient(id) {
    setClientsSelectionnes(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  function toutSelectionner() {
    setClientsSelectionnes(
      clientsSelectionnes.length === clientsDuSecteur.length
        ? []
        : clientsDuSecteur.map(c => c.id)
    );
  }

  async function lancer() {
    setGeocodage(true);
    const clientsChoisis = clients.filter(c => clientsSelectionnes.includes(c.id));

    // Géocoder les clients sans coordonnées
    const clientsAvecCoords = await Promise.all(
      clientsChoisis.map(async (client) => {
        if (client.lat && client.lng) return client;
        const coords = await geocoderAdresse(client.adresse);
        if (coords) {
          // Sauvegarder les coords dans Supabase pour la prochaine fois
          await supabase.from('clients').update({ lat: coords.lat, lng: coords.lng }).eq('id', client.id);
          return { ...client, ...coords };
        }
        return null;
      })
    );

    const clientsValides = clientsAvecCoords.filter(Boolean);
    setGeocodage(false);
    onLancer({ clients: clientsValides, depart, semaine, lundi });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-900 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={onCancel} className="text-xl">←</button>
        <div>
          <h1 className="text-lg font-bold">Planifier mes tournées</h1>
          <p className="text-blue-200 text-sm">Étape {etape} sur 3</p>
        </div>
      </div>

      <div className="flex gap-1 px-4 pt-3">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition ${etape >= i ? 'bg-orange-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* ÉTAPE 1 — Semaine */}
      {etape === 1 && (
        <div className="m-4 space-y-3">
          <h2 className="text-lg font-bold text-blue-900">📅 Quelle semaine ?</h2>
          {[0, 1, 2, 3].map(offset => {
            const l = getLundiSemaine(offset);
            return (
              <div key={offset} onClick={() => setSemaine(offset)}
                className={`bg-white rounded-xl shadow p-4 cursor-pointer border-2 transition ${semaine === offset ? 'border-blue-900' : 'border-transparent'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-blue-900">
                      {offset === 0 ? 'Cette semaine' : offset === 1 ? 'Semaine prochaine' : `Dans ${offset} semaines`}
                    </p>
                    <p className="text-gray-500 text-sm">{formatSemaine(l)}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${semaine === offset ? 'bg-blue-900 border-blue-900' : 'border-gray-300'}`}>
                    {semaine === offset && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={() => setEtape(2)} className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold mt-4">
            Suivant →
          </button>
        </div>
      )}

      {/* ÉTAPE 2 — Départ */}
      {etape === 2 && (
        <div className="m-4 space-y-3">
          <h2 className="text-lg font-bold text-blue-900">📍 Point de départ</h2>
          {POINTS_DEPART.map(p => (
            <div key={p.id} onClick={() => setDepart(p)}
              className={`bg-white rounded-xl shadow p-4 cursor-pointer border-2 transition ${depart.id === p.id ? 'border-blue-900' : 'border-transparent'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-blue-900">{p.nom}</p>
                  <p className="text-gray-400 text-xs">{p.lat.toFixed(3)}, {p.lng.toFixed(3)}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${depart.id === p.id ? 'bg-blue-900 border-blue-900' : 'border-gray-300'}`}>
                  {depart.id === p.id && <span className="text-white text-xs">✓</span>}
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setEtape(1)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold">← Retour</button>
            <button onClick={() => setEtape(3)} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold">Suivant →</button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 — Clients */}
      {etape === 3 && (
        <div className="m-4 space-y-3">
          <h2 className="text-lg font-bold text-blue-900">👥 Clients à planifier</h2>
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">{clientsSelectionnes.length} sélectionné(s)</p>
            <button onClick={toutSelectionner} className="text-sm text-blue-900 font-semibold">
              {clientsSelectionnes.length === clientsDuSecteur.length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </button>
          </div>
          <input type="text" placeholder="🔍 Rechercher..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
            value={recherche} onChange={e => setRecherche(e.target.value)} />

          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">⏳</p>
              <p>Chargement des clients...</p>
            </div>
          ) : clientsDuSecteur.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">👥</p>
              <p className="font-medium">Aucun client dans ce secteur</p>
              <p className="text-sm mt-1">Ajoutez des clients dans l'onglet Clients</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clientsFiltres.map(client => (
                <div key={client.id} onClick={() => toggleClient(client.id)}
                  className={`bg-white rounded-xl shadow p-3 cursor-pointer border-2 transition ${clientsSelectionnes.includes(client.id) ? 'border-blue-900' : 'border-transparent'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-blue-900 text-sm">{client.prenom} {client.nom}</p>
                      <p className="text-gray-500 text-xs">{client.adresse}</p>
                      <p className="text-gray-400 text-xs">{client.appareil} · {client.lat ? '📍 Géolocalisé' : '⚠️ Pas de coordonnées'}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${clientsSelectionnes.includes(client.id) ? 'bg-blue-900 border-blue-900' : 'border-gray-300'}`}>
                      {clientsSelectionnes.includes(client.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEtape(2)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold">← Retour</button>
            <button onClick={lancer} disabled={clientsSelectionnes.length === 0 || geocodage}
              className={`flex-1 py-3 rounded-xl font-semibold text-white transition ${clientsSelectionnes.length > 0 && !geocodage ? 'bg-orange-500' : 'bg-gray-300'}`}>
              {geocodage ? '📍 Géolocalisation...' : `✨ Optimiser (${clientsSelectionnes.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function Tournee({ onValiderTournees }) {
  const [secteur, setSecteur] = useState('nord');
  const [jourSelectionne, setJourSelectionne] = useState(0);
  const [tournees, setTournees] = useState([]);
  const [optimise, setOptimise] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [config, setConfig] = useState(null);

  const configSecteur = SECTEURS[secteur];

  function lancerDepuisAssistant({ clients, depart, lundi }) {
    setAssistant(false);
    setLoading(true);
    setOptimise(false);
    setConfig({ depart, lundi });

    setTimeout(() => {
      const clientsAvecDuree = clients.map(c => ({ ...c, duree: 45 }));
      const nbJours = Math.min(5, Math.ceil(clientsAvecDuree.length / 6));
      const resultat = optimiserTournees(
        clientsAvecDuree, depart.lat, depart.lng, nbJours
      ).map((t, i) => ({ ...t, couleur: configSecteur.couleurs[i] || '#666' }));
      setTournees(resultat);
      setOptimise(true);
      setJourSelectionne(0);
      setLoading(false);
    }, 500);
  }

  async function validerEtInscrire() {
    const nouvelles = tournees.flatMap((t, jourIdx) =>
      t.clients.map(client => {
        const date = new Date(config.lundi);
        date.setDate(config.lundi.getDate() + jourIdx);
        return {
          client: client.nom || `${client.prenom} ${client.nom}`,
          adresse: client.adresse,
          heure: client.heureDebut,
          duree: client.duree,
          statut: 'planifie',
          appareil: client.appareil || 'À préciser',
          notes: `🚗 Trajet estimé : ${client.trajetDepuis} min`,
          date: date.toISOString().split('T')[0],
        };
      })
    );

    // Sauvegarder dans Supabase
    const { error } = await supabase.from('interventions').insert(nouvelles);
    if (error) {
      alert('Erreur lors de l\'inscription : ' + error.message);
    } else {
      onValiderTournees(nouvelles);
    }
  }

  if (assistant) {
    return <AssistantPlanification secteur={secteur} onLancer={lancerDepuisAssistant} onCancel={() => setAssistant(false)} />;
  }

  const tournee = tournees[jourSelectionne];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-blue-900 text-white px-4 py-4">
        <h1 className="text-xl font-bold">🗺️ Tournées</h1>
        <p className="text-blue-200 text-sm">Optimisation par secteur</p>
      </div>

      <div className="m-4 bg-white rounded-xl shadow p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Secteur de travail</p>
        <div className="grid grid-cols-2 gap-3">
          {Object.values(SECTEURS).map(s => (
            <button key={s.id}
              onClick={() => { setSecteur(s.id); setOptimise(false); setTournees([]); }}
              className={`p-3 rounded-xl border-2 text-left transition ${secteur === s.id ? 'border-blue-900 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              <p className={`font-bold text-sm ${secteur === s.id ? 'text-blue-900' : 'text-gray-600'}`}>{s.label}</p>
              <p className="text-xs text-gray-400 mt-1">{s.description}</p>
            </button>
          ))}
        </div>
      </div>

      {!optimise && !loading && (
        <div className="mx-4">
          <button onClick={() => setAssistant(true)}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg shadow">
            ✨ Optimiser les tournées
          </button>
          <p className="text-center text-gray-400 text-xs mt-2">
            Choisissez la semaine, le départ et les clients
          </p>
        </div>
      )}

      {loading && (
        <div className="mx-4 mt-4 text-center py-12">
          <p className="text-4xl mb-3">⏳</p>
          <p className="text-blue-900 font-semibold">Calcul en cours...</p>
        </div>
      )}

      {optimise && tournee && config && (
        <>
          <div className="mx-4 mt-2 bg-blue-50 rounded-xl p-3 flex justify-between items-center">
            <div>
              <p className="text-blue-900 font-semibold text-sm">📅 {formatSemaine(config.lundi)}</p>
              <p className="text-blue-700 text-xs mt-1">📍 Départ : {config.depart.nom}</p>
            </div>
            <span className="text-xs bg-blue-900 text-white px-2 py-1 rounded-full">
              {tournees.reduce((t, j) => t + j.nbClients, 0)} clients
            </span>
          </div>

          <div className="flex gap-2 px-4 py-3 overflow-x-auto">
            {tournees.map((t, i) => (
              <button key={i} onClick={() => setJourSelectionne(i)}
                className="px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap border-2 transition"
                style={jourSelectionne === i
                  ? { backgroundColor: t.couleur, borderColor: t.couleur, color: 'white' }
                  : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#4b5563' }}>
                {t.jour} ({t.nbClients})
              </button>
            ))}
          </div>

          <div className="mx-4 rounded-xl overflow-hidden shadow">
            <Carte tournees={tournees} jourSelectionne={jourSelectionne} depart={config.depart} />
          </div>

          <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl shadow p-3 text-center">
              <p className="text-xl font-bold text-blue-900">{tournee.nbClients}</p>
              <p className="text-xs text-gray-500">Clients</p>
            </div>
            <div className="bg-white rounded-xl shadow p-3 text-center">
              <p className="text-xl font-bold text-orange-500">{tournee.kmTotal} km</p>
              <p className="text-xs text-gray-500">Distance est.</p>
            </div>
            <div className="bg-white rounded-xl shadow p-3 text-center">
              <p className="text-xl font-bold text-green-600">
                {tournee.clients.length > 0 ? tournee.clients[tournee.clients.length - 1].heureFin : '--'}
              </p>
              <p className="text-xs text-gray-500">Fin estimée</p>
            </div>
          </div>

          <div className="mx-4 mt-3 space-y-2">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Ordre de passage — {tournee.jour}
            </p>
            {tournee.clients.map((client, i) => (
              <div key={client.id} className="bg-white rounded-xl shadow p-3 flex items-center gap-3">
                <div className="rounded-full w-9 h-9 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: tournee.couleur }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-blue-900 text-sm truncate">{client.prenom} {client.nom}</p>
                  <p className="text-gray-500 text-xs truncate">{client.adresse}</p>
                  {client.trajetDepuis > 0 && (
                    <p className="text-gray-400 text-xs">🚗 {client.trajetDepuis} min de trajet</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-blue-900">{client.heureDebut}</p>
                  <p className="text-xs text-gray-400">{client.duree} min</p>
                </div>
              </div>
            ))}

            {tournee.horsPlage?.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                <p className="text-red-600 font-semibold text-sm">⚠️ {tournee.horsPlage.length} client(s) hors plage 18h</p>
                {tournee.horsPlage.map(c => (
                  <p key={c.id} className="text-red-500 text-xs mt-1">• {c.prenom} {c.nom} — {c.adresse}</p>
                ))}
              </div>
            )}
          </div>

          <div className="mx-4 mt-4 space-y-3">
            <button onClick={validerEtInscrire}
              className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg shadow">
              ✅ Valider et inscrire au planning
            </button>
            <button className="w-full bg-blue-900 text-white py-3 rounded-xl font-semibold">
              📧 Notifier les clients (~10 jours avant)
            </button>
            <button onClick={() => { setOptimise(false); setTournees([]); setAssistant(true); }}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold">
              🔄 Modifier / Recalculer
            </button>
          </div>
        </>
      )}
    </div>
  );
}