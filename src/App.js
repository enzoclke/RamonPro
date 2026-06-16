import React, { useState } from 'react';
import { supabase } from './supabase';
import Login from './Login';
import Clients from './Clients';
import Planning from './Planning';
import Tournee from './Tournee';
import Frais from './Frais';
import Messages from './Messages';

function formatDateLocale(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

const interventionsInitiales = [];

function App() {
  const [onglet, setOnglet] = useState('accueil');
  const [interventions, setInterventions] = useState(interventionsInitiales);
  const [session, setSession] = useState(null);
  const [chargementSession, setChargementSession] = useState(true);
  const [interventionsAccueil, setInterventionsAccueil] = useState([]);
  const [prochainRDV, setProchainRDV] = useState(null);
  const [rdvSemaine, setRdvSemaine] = useState(0);
  const [clientsAjoutesMois, setClientsAjoutesMois] = useState(0);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setChargementSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (session) chargerDonneesAccueil();
  }, [session]);

  async function chargerDonneesAccueil() {
    const maintenant = new Date();
    const aujourdHuiStr = formatDateLocale(maintenant);

    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const debutMoisStr = formatDateLocale(debutMois);

    const finSemaine = new Date(maintenant);
    finSemaine.setDate(finSemaine.getDate() + 7);
    const finSemaineStr = formatDateLocale(finSemaine);

    // Interventions du mois (pour les stats)
    const { data: dataMois } = await supabase
      .from('interventions')
      .select('*')
      .gte('date', debutMoisStr);
    setInterventionsAccueil(dataMois || []);

    // Interventions d'aujourd'hui (filtrage local, fuseau horaire correct)
    // (dataMois couvre déjà le mois en cours donc aujourd'hui est inclus dedans)

    // Prochain RDV à venir (aujourd'hui ou après, le plus proche)
    const { data: dataProchain } = await supabase
      .from('interventions')
      .select('*')
      .gte('date', aujourdHuiStr)
      .eq('statut', 'planifie')
      .order('date', { ascending: true })
      .order('heure', { ascending: true })
      .limit(1);
    setProchainRDV(dataProchain && dataProchain[0] ? dataProchain[0] : null);

    // RDV prévus sur les 7 prochains jours
    const { count: countSemaine } = await supabase
      .from('interventions')
      .select('*', { count: 'exact', head: true })
      .gte('date', aujourdHuiStr)
      .lte('date', finSemaineStr);
    setRdvSemaine(countSemaine || 0);

    // Clients ajoutés ce mois-ci
    const { count: countClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', debutMois.toISOString());
    setClientsAjoutesMois(countClients || 0);
  }

  function ajouterInterventions(nouvelles) {
    setInterventions(prev => [...prev, ...nouvelles]);
    setOnglet('planning');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (chargementSession) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!session) {
    return <Login />;
  }

  const aujourdHuiStr = formatDateLocale(new Date());

  return (
    <div className="min-h-screen bg-gray-50">

      {onglet === 'accueil' && (
        <>
          <div className="bg-blue-900 text-white px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">Bonjour Kevin 👋</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setOnglet('messages')} className="text-white text-2xl">
                📧
              </button>
              <button onClick={handleLogout} className="text-blue-200 text-sm border border-blue-300 rounded-lg px-3 py-1">
                Déconnexion
              </button>
            </div>
          </div>
          <div className="m-4 bg-white rounded-xl shadow p-4">
            <h2 className="font-bold text-blue-900 text-lg mb-2">Aujourd'hui</h2>
            <p className="text-gray-600">{interventionsAccueil.filter(i => i.date === aujourdHuiStr).length} interventions prévues</p>
            <p className="text-gray-600">
              {prochainRDV
                ? <>Prochain RDV : <strong>{prochainRDV.heure} — {prochainRDV.client}</strong></>
                : 'Aucun RDV à venir'}
            </p>
            <button onClick={() => setOnglet('tournee')} className="mt-3 w-full bg-orange-500 text-white py-2 rounded-lg font-semibold">Voir ma tournée →</button>
          </div>
          <div className="mx-4 bg-white rounded-xl shadow p-4">
            <h2 className="font-bold text-blue-900 text-lg mb-2">⚠️ À relancer</h2>
            <p className="text-gray-600">3 clients n'ont pas été ramonés depuis plus de 11 mois</p>
            <button onClick={() => setOnglet('messages')} className="mt-3 w-full bg-blue-900 text-white py-2 rounded-lg font-semibold">Envoyer les rappels →</button>
          </div>
          <div className="mx-4 mt-4 bg-white rounded-xl shadow p-4">
            <h2 className="font-bold text-blue-900 text-lg mb-3">📊 Ce mois-ci</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-blue-900">{interventionsAccueil.filter(i => i.statut === 'realise').length}</p>
                <p className="text-xs text-gray-500 mt-1">Interventions</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-orange-500">{rdvSemaine}</p>
                <p className="text-xs text-gray-500 mt-1">RDV cette semaine</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-600">{clientsAjoutesMois}</p>
                <p className="text-xs text-gray-500 mt-1">Clients ajoutés</p>
              </div>
            </div>
          </div>
        </>
      )}

      {onglet === 'clients' && <Clients />}
      {onglet === 'planning' && (
        <Planning
          interventions={interventions}
          setInterventions={setInterventions}
        />
      )}
      {onglet === 'tournee' && (
        <Tournee onValiderTournees={ajouterInterventions} />
      )}
      {onglet === 'frais' && <Frais />}
      {onglet === 'messages' && <Messages />}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        {[
          { id: 'accueil', icon: '🏠', label: 'Accueil' },
          { id: 'clients', icon: '👥', label: 'Clients' },
          { id: 'planning', icon: '📅', label: 'Planning' },
          { id: 'tournee', icon: '🗺️', label: 'Tournée' },
          { id: 'frais', icon: '💶', label: 'Frais' },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            className={`flex flex-col items-center ${onglet === o.id ? 'text-blue-900' : 'text-gray-400'}`}>
            <span className="text-xl">{o.icon}</span>
            <span className={`text-xs ${onglet === o.id ? 'font-semibold' : ''}`}>{o.label}</span>
          </button>
        ))}
      </div>

    </div>
  );
}

export default App;