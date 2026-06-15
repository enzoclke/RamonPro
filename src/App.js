import React, { useState } from 'react';
import { supabase } from './supabase';
import Login from './Login';
import Clients from './Clients';
import Planning from './Planning';
import Tournee from './Tournee';
import Frais from './Frais';
import Messages from './Messages';

const interventionsInitiales = [
  { id: 1, client: 'Jean Dupont', adresse: '12 rue des Lilas, Dijon', heure: '08:00', duree: 45, statut: 'planifie', appareil: 'Insert', date: new Date().toISOString().split('T')[0] },
  { id: 2, client: 'Sophie Martin', adresse: '4 avenue Foch, Beaune', heure: '09:00', duree: 30, statut: 'planifie', appareil: 'Poêle', date: new Date().toISOString().split('T')[0] },
  { id: 3, client: 'Paul Bernard', adresse: '8 rue Carnot, Nuits-Saint-Georges', heure: '10:00', duree: 45, statut: 'realise', appareil: 'Foyer ouvert', date: new Date().toISOString().split('T')[0] },
  { id: 4, client: 'Marie Petit', adresse: '2 rue de la Paix, Dijon', heure: '11:00', duree: 30, statut: 'planifie', appareil: 'Chaudière', date: new Date().toISOString().split('T')[0] },
];

function App() {
  const [onglet, setOnglet] = useState('accueil');
  const [interventions, setInterventions] = useState(interventionsInitiales);
  const [session, setSession] = useState(null);
  const [chargementSession, setChargementSession] = useState(true);
  const [interventionsAccueil, setInterventionsAccueil] = useState([]);
  const [prochainRDV, setProchainRDV] = useState(null);

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
    const aujourdHui = new Date().toISOString().split('T')[0];
    const debutMois = new Date();
    debutMois.setDate(1);
    const debutMoisStr = debutMois.toISOString().split('T')[0];

    // Interventions du mois (pour les stats)
    const { data: dataMois } = await supabase
      .from('interventions')
      .select('*')
      .gte('date', debutMoisStr);
    setInterventionsAccueil(dataMois || []);

    // Prochain RDV à venir (aujourd'hui ou après, le plus proche)
    const { data: dataProchain } = await supabase
      .from('interventions')
      .select('*')
      .gte('date', aujourdHui)
      .eq('statut', 'planifie')
      .order('date', { ascending: true })
      .order('heure', { ascending: true })
      .limit(1);
    setProchainRDV(dataProchain && dataProchain[0] ? dataProchain[0] : null);
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
            <p className="text-gray-600">{interventionsAccueil.filter(i => i.date === new Date().toISOString().split('T')[0]).length} interventions prévues</p>
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
                <p className="text-2xl font-bold text-orange-500">12</p>
                <p className="text-xs text-gray-500 mt-1">Certificats</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-600">5</p>
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
      {onglet === 'frais' && <Frais />}
      {onglet === 'tournee' && (
        <Tournee onValiderTournees={ajouterInterventions} />
      )}
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