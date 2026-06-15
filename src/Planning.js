import React, { useState, useEffect } from 'react';
import NouveauRDV from './NouveauRDV';
import { supabase } from './supabase';

function formatDateLocale(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

const jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const joursComplets = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function getLundiSemaine(offset = 0) {
  const today = new Date();
  const lundi = new Date(today);
  lundi.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  lundi.setHours(0, 0, 0, 0);
  return lundi;
}

function getDatesSemaine(lundi) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    return d;
  });
}

const STATUTS = {
  planifie: { label: 'Planifié', color: 'bg-blue-100 text-blue-700' },
  realise: { label: 'Réalisé', color: 'bg-green-100 text-green-700' },
  annule: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
};

const COULEURS_JOUR = [
  'border-l-blue-900', 'border-l-orange-500', 'border-l-green-500',
  'border-l-purple-500', 'border-l-red-500', 'border-l-yellow-500', 'border-l-pink-500'
];

export default function Planning({ interventions, setInterventions }) {
  const [offsetSemaine, setOffsetSemaine] = useState(0);
  const [jourSelectionne, setJourSelectionne] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );
  const [vue, setVue] = useState('jour');
  const [selected, setSelected] = useState(null);
  const [ajoutRDV, setAjoutRDV] = useState(false);
  const [loading, setLoading] = useState(true);

  const lundi = getLundiSemaine(offsetSemaine);
  const dates = getDatesSemaine(lundi);
  const isCurrentWeek = offsetSemaine === 0;

  useEffect(() => {
    chargerInterventions();
  }, [offsetSemaine]);

  async function chargerInterventions() {
    setLoading(true);
    const dateDebut = formatDateLocale(dates[0]);
    const dateFin = formatDateLocale(dates[6]);
    const { data, error } = await supabase
      .from('interventions')
      .select('*')
      .gte('date', dateDebut)
      .lte('date', dateFin)
      .order('date', { ascending: true })
      .order('heure', { ascending: true });
    if (!error) setInterventions(data || []);
    setLoading(false);
  }

  async function ajouterRDV(rdv) {
    const nouveau = {
      client: `${rdv.client.prenom} ${rdv.client.nom}`,
      adresse: rdv.client.adresse,
      heure: rdv.heure,
      duree: parseInt(rdv.duree),
      statut: 'planifie',
      appareil: rdv.client.appareil,
      notes: rdv.notes || null,
      date: rdv.date,
    };
    const { data, error } = await supabase
      .from('interventions')
      .insert([nouveau])
      .select();
    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      setInterventions(prev => [...prev, data[0]]);
      setAjoutRDV(false);
    }
  }

  async function changerStatut(id, statut) {
    const { data, error } = await supabase
      .from('interventions')
      .update({ statut })
      .eq('id', id)
      .select();
    if (!error) {
      setInterventions(prev => prev.map(i => i.id === id ? data[0] : i));
      setSelected(prev => ({ ...prev, statut }));
    }
  }

  async function supprimerIntervention(id) {
    if (!window.confirm('Supprimer ce RDV ?')) return;
    const { error } = await supabase
      .from('interventions')
      .delete()
      .eq('id', id);
    if (!error) {
      setInterventions(prev => prev.filter(i => i.id !== id));
      setSelected(null);
    }
  }

  const dateSelectionnee = formatDateLocale(dates[jourSelectionne]);
  const interventionsDuJour = interventions
    .filter(i => i.date === dateSelectionnee)
    .sort((a, b) => a.heure.localeCompare(b.heure));

  const interventionsSemaine = dates.map((d, i) => ({
    date: d,
    jour: jours[i],
    jourComplet: joursComplets[i],
    interventions: interventions
      .filter(intervention => intervention.date === formatDateLocale(d))
      .sort((a, b) => a.heure.localeCompare(b.heure))
  }));

  const totalSemaine = interventionsSemaine.reduce((t, j) => t + j.interventions.length, 0);

  if (ajoutRDV) {
    return <NouveauRDV onCancel={() => setAjoutRDV(false)} onSave={ajouterRDV} />;
  }

  if (selected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-900 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-white text-xl">←</button>
          <h1 className="text-lg font-bold">{selected.client}</h1>
        </div>
        <div className="m-4 bg-white rounded-xl shadow p-4 space-y-3">
          <div><span className="text-gray-400 text-sm">Date</span>
            <p className="font-medium">{new Date(selected.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div><span className="text-gray-400 text-sm">Adresse</span><p className="font-medium">{selected.adresse}</p></div>
          <div><span className="text-gray-400 text-sm">Appareil</span><p className="font-medium">{selected.appareil}</p></div>
          <div><span className="text-gray-400 text-sm">Heure</span><p className="font-medium">{selected.heure}</p></div>
          <div><span className="text-gray-400 text-sm">Durée</span><p className="font-medium">{selected.duree} min</p></div>
          {selected.notes && <div><span className="text-gray-400 text-sm">Notes</span><p className="font-medium">{selected.notes}</p></div>}
          <div>
            <span className="text-gray-400 text-sm">Statut</span>
            <div className="mt-1 flex gap-2 flex-wrap">
              {Object.entries(STATUTS).map(([key, val]) => (
                <button key={key}
                  onClick={() => changerStatut(selected.id, key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${selected.statut === key ? val.color : 'bg-gray-100 text-gray-400'}`}>
                  {val.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mx-4 space-y-3">
          <button onClick={() => changerStatut(selected.id, 'realise')}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold">
            ✅ Marquer comme réalisé
          </button>
          <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selected.adresse)}`, '_blank')}
            className="w-full bg-blue-900 text-white py-3 rounded-xl font-semibold">
            🗺️ Lancer la navigation
          </button>
          <button className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold">
            📄 Générer le certificat
          </button>
          <button onClick={() => supprimerIntervention(selected.id)}
            className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-semibold border border-red-200">
            🗑️ Supprimer ce RDV
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-900 text-white px-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">📅 Planning</h1>
          <div className="flex gap-1 bg-blue-800 rounded-lg p-1">
            {[['jour', '📋'], ['semaine', '🗓️'], ['liste', '☰']].map(([id, icon]) => (
              <button key={id} onClick={() => setVue(id)}
                className={`px-2 py-1 rounded text-xs font-semibold transition ${vue === id ? 'bg-white text-blue-900' : 'text-blue-200'}`}>
                {icon} {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setOffsetSemaine(o => o - 1)}
            className="bg-blue-800 text-white px-3 py-1 rounded-lg text-sm font-semibold">
            ← Préc.
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold">
              {isCurrentWeek ? 'Cette semaine' : offsetSemaine > 0 ? `Dans ${offsetSemaine} semaine${offsetSemaine > 1 ? 's' : ''}` : `Il y a ${Math.abs(offsetSemaine)} semaine${Math.abs(offsetSemaine) > 1 ? 's' : ''}`}
            </p>
            <p className="text-blue-200 text-xs">
              {lundi.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → {dates[4].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <button onClick={() => setOffsetSemaine(o => o + 1)}
            className="bg-blue-800 text-white px-3 py-1 rounded-lg text-sm font-semibold">
            Suiv. →
          </button>
        </div>
      </div>

      {/* VUE JOUR */}
      {vue === 'jour' && (
        <>
          <div className="bg-white border-b border-gray-100 px-2 py-3 flex justify-around">
            {jours.map((jour, i) => {
              const nbRDV = interventionsSemaine[i].interventions.length;
              return (
                <button key={i} onClick={() => setJourSelectionne(i)}
                  className={`flex flex-col items-center px-2 py-1 rounded-xl transition ${jourSelectionne === i ? 'bg-blue-900 text-white' : 'text-gray-500'}`}>
                  <span className="text-xs">{jour}</span>
                  <span className="text-sm font-bold">{dates[i].getDate()}</span>
                  {nbRDV > 0 && (
                    <span className={`text-xs font-bold ${jourSelectionne === i ? 'text-blue-200' : 'text-orange-500'}`}>{nbRDV}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="m-4 space-y-3">
            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">⏳</p>
                <p className="font-medium">Chargement...</p>
              </div>
            ) : interventionsDuJour.length > 0 ? (
              <>
                <p className="text-sm text-gray-400">{joursComplets[jourSelectionne]} {dates[jourSelectionne].getDate()} — {interventionsDuJour.length} intervention(s)</p>
                {interventionsDuJour.map(rdv => (
                  <div key={rdv.id} onClick={() => setSelected(rdv)}
                    className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3 items-start">
                        <div className="bg-blue-900 text-white rounded-lg px-2 py-1 text-xs font-bold min-w-[48px] text-center">
                          {rdv.heure}
                        </div>
                        <div>
                          <p className="font-bold text-blue-900">{rdv.client}</p>
                          <p className="text-gray-500 text-sm">{rdv.adresse}</p>
                          <p className="text-gray-400 text-xs">{rdv.appareil} · {rdv.duree} min</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUTS[rdv.statut]?.color || 'bg-gray-100 text-gray-400'}`}>
                        {STATUTS[rdv.statut]?.label || rdv.statut}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📅</p>
                <p className="font-medium">Aucune intervention ce jour</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* VUE SEMAINE */}
      {vue === 'semaine' && (
        <div className="m-4 space-y-3">
          <p className="text-sm text-gray-400">{totalSemaine} intervention(s) cette semaine</p>
          {interventionsSemaine.map((jour, i) => (
            <div key={i} className={`bg-white rounded-xl shadow overflow-hidden border-l-4 ${COULEURS_JOUR[i]}`}>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-50">
                <p className="font-bold text-blue-900">{jour.jourComplet} {jour.date.getDate()}</p>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${jour.interventions.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                  {jour.interventions.length} RDV
                </span>
              </div>
              {jour.interventions.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {jour.interventions.map(rdv => (
                    <div key={rdv.id} onClick={() => setSelected(rdv)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
                      <span className="text-xs font-bold text-blue-900 w-12">{rdv.heure}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-blue-900 truncate">{rdv.client}</p>
                        <p className="text-xs text-gray-400 truncate">{rdv.adresse}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUTS[rdv.statut]?.color}`}>
                        {STATUTS[rdv.statut]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm px-4 py-3">Aucun RDV</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* VUE LISTE */}
      {vue === 'liste' && (
        <div className="m-4 space-y-2">
          <p className="text-sm text-gray-400">{totalSemaine} intervention(s) cette semaine</p>
          {interventionsSemaine.flatMap(jour =>
            jour.interventions.map(rdv => ({ ...rdv, jourLabel: jour.jourComplet, dateLabel: jour.date.getDate() }))
          ).length > 0 ? (
            interventionsSemaine.flatMap(jour =>
              jour.interventions.map(rdv => ({ ...rdv, jourLabel: jour.jourComplet, dateLabel: jour.date.getDate() }))
            ).map(rdv => (
              <div key={rdv.id} onClick={() => setSelected(rdv)}
                className="bg-white rounded-xl shadow p-3 cursor-pointer hover:shadow-md transition flex items-center gap-3">
                <div className="bg-blue-900 text-white rounded-lg px-2 py-2 text-center min-w-[52px]">
                  <p className="text-xs">{rdv.jourLabel.slice(0, 3)}</p>
                  <p className="text-sm font-bold">{rdv.dateLabel}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-blue-900 text-sm truncate">{rdv.client}</p>
                  <p className="text-gray-500 text-xs truncate">{rdv.adresse}</p>
                  <p className="text-gray-400 text-xs">{rdv.heure} · {rdv.duree} min</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${STATUTS[rdv.statut]?.color}`}>
                  {STATUTS[rdv.statut]?.label}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">Aucune intervention cette semaine</p>
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-20 right-4">
        <button onClick={() => setAjoutRDV(true)}
          className="bg-orange-500 text-white rounded-full w-14 h-14 text-2xl shadow-lg flex items-center justify-center">
          +
        </button>
      </div>
      <div className="h-24" />
    </div>
  );
}