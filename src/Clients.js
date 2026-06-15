import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

function moisDepuis(date) {
  if (!date) return null;
  const diff = new Date() - new Date(date);
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
}

const APPAREILS = ['Insert', 'Foyer ouvert', 'Poêle', 'Chaudière'];

function FormulaireClient({ onSave, onCancel, initial = {} }) {
  const [form, setForm] = useState({
    prenom: initial.prenom || '',
    nom: initial.nom || '',
    adresse: initial.adresse || '',
    telephone: initial.telephone || '',
    email: initial.email || '',
    appareil: initial.appareil || 'Insert',
    derniere_intervention: initial.derniere_intervention || '',
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit() {
    if (!form.prenom || !form.nom || !form.adresse || !form.telephone) {
      alert('Merci de remplir les champs obligatoires (*)');
      return;
    }
    setLoading(true);
    await onSave(form);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-900 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={onCancel} className="text-white text-xl">←</button>
        <h1 className="text-lg font-bold">{initial.id ? 'Modifier le client' : 'Nouveau client'}</h1>
      </div>
      <div className="m-4 bg-white rounded-xl shadow p-4 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">Prénom *</label>
            <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Jean"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">Nom *</label>
            <input name="nom" value={form.nom} onChange={handleChange} placeholder="Dupont"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Adresse *</label>
          <input name="adresse" value={form.adresse} onChange={handleChange} placeholder="12 rue des Lilas, Dijon"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Téléphone *</label>
          <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="06 12 34 56 78"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Email</label>
          <input name="email" value={form.email} onChange={handleChange} placeholder="jean.dupont@email.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Type d'appareil *</label>
          <select name="appareil" value={form.appareil} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900">
            {APPAREILS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Dernière intervention</label>
          <input type="date" name="derniere_intervention" value={form.derniere_intervention} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
        </div>
      </div>
      <div className="mx-4 space-y-3">
        <button onClick={handleSubmit} disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold text-lg text-white ${loading ? 'bg-gray-400' : 'bg-orange-500'}`}>
          {loading ? '⏳ Enregistrement...' : '✅ Enregistrer le client'}
        </button>
        <button onClick={onCancel} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold">
          Annuler
        </button>
      </div>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [vue, setVue] = useState('liste');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interventionsClient, setInterventionsClient] = useState([]);

  useEffect(() => {
    chargerClients();
  }, []);

  async function chargerClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom', { ascending: true });
    if (error) {
      console.error('Erreur chargement clients:', error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  }

  async function chargerInterventionsClient(client) {
    const nomComplet = `${client.prenom} ${client.nom}`;
    const { data, error } = await supabase
      .from('interventions')
      .select('*')
      .eq('client', nomComplet)
      .order('date', { ascending: true });
    if (error) {
      console.error('Erreur chargement interventions:', error);
      setInterventionsClient([]);
    } else {
      setInterventionsClient(data || []);
    }
  }

  async function ajouterClient(form) {
    const data_a_envoyer = {
      ...form,
      derniere_intervention: form.derniere_intervention || null,
    };
    const { data, error } = await supabase
      .from('clients')
      .insert([data_a_envoyer])
      .select();
    if (error) {
      alert('Erreur lors de l\'ajout : ' + error.message);
    } else {
      setClients(prev => [...prev, data[0]]);
      setVue('liste');
    }
  }

  async function modifierClient(form) {
    const data_a_envoyer = {
      ...form,
      derniere_intervention: form.derniere_intervention || null,
    };
    const { data, error } = await supabase
      .from('clients')
      .update(data_a_envoyer)
      .eq('id', selected.id)
      .select();
    if (error) {
      alert('Erreur lors de la modification : ' + error.message);
    } else {
      setClients(prev => prev.map(c => c.id === selected.id ? data[0] : c));
      setSelected(data[0]);
      setVue('fiche');
    }
  }

  async function supprimerClient() {
    if (!window.confirm(`Supprimer ${selected.prenom} ${selected.nom} ?`)) return;
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', selected.id);
    if (error) {
      alert('Erreur lors de la suppression : ' + error.message);
    } else {
      setClients(prev => prev.filter(c => c.id !== selected.id));
      setVue('liste');
    }
  }

  const filtres = clients.filter(c =>
    `${c.nom} ${c.prenom} ${c.adresse}`.toLowerCase().includes(recherche.toLowerCase())
  );

  if (vue === 'nouveau') {
    return <FormulaireClient onSave={ajouterClient} onCancel={() => setVue('liste')} />;
  }

  if (vue === 'modifier' && selected) {
    return <FormulaireClient initial={selected} onSave={modifierClient} onCancel={() => setVue('fiche')} />;
  }

  if (vue === 'fiche' && selected) {
    const mois = moisDepuis(selected.derniere_intervention);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-900 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => setVue('liste')} className="text-white text-xl">←</button>
          <h1 className="text-lg font-bold">{selected.prenom} {selected.nom}</h1>
        </div>
        <div className="m-4 bg-white rounded-xl shadow p-4 space-y-3">
          <div><span className="text-gray-400 text-sm">Adresse</span><p className="font-medium">{selected.adresse}</p></div>
          <div><span className="text-gray-400 text-sm">Téléphone</span><p className="font-medium">{selected.telephone}</p></div>
          {selected.email && <div><span className="text-gray-400 text-sm">Email</span><p className="font-medium">{selected.email}</p></div>}
          <div><span className="text-gray-400 text-sm">Appareil</span><p className="font-medium">{selected.appareil}</p></div>
          <div>
            <span className="text-gray-400 text-sm">Dernière intervention</span>
            <p className="font-medium">{selected.derniere_intervention || 'Non renseignée'}</p>
            {mois !== null && (
              <span className={`text-xs px-2 py-1 rounded-full ${mois > 11 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {mois > 11 ? `⚠️ ${mois} mois — À relancer !` : `✅ ${mois} mois — OK`}
              </span>
            )}
          </div>
        </div>

        <div className="m-4 bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-blue-900 text-lg mb-3">📅 Historique & RDV</h2>
          {interventionsClient.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune intervention enregistrée</p>
          ) : (
            <div className="space-y-2">
              {interventionsClient.map(inter => (
                <div key={inter.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{new Date(inter.date).toLocaleDateString('fr-FR')}</p>
                    <p className="text-gray-400 text-xs">{inter.heure} — {inter.appareil}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${inter.statut === 'realise' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {inter.statut === 'realise' ? '✅ Réalisé' : '📅 Prévu'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mx-4 space-y-3">
          <button className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold">📅 Planifier une intervention</button>
          <button className="w-full bg-blue-900 text-white py-3 rounded-xl font-semibold">📧 Envoyer un rappel</button>
          <button onClick={() => setVue('modifier')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">
            ✏️ Modifier ce client
          </button>
          <button onClick={supprimerClient} className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-semibold border border-red-200">
            🗑️ Supprimer ce client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-900 text-white px-4 py-4">
        <h1 className="text-xl font-bold">👥 Clients</h1>
        <p className="text-blue-200 text-sm">{clients.length} clients</p>
      </div>
      <div className="m-4">
        <input type="text" placeholder="🔍 Rechercher un client..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
          value={recherche} onChange={e => setRecherche(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⏳</p>
          <p className="font-medium">Chargement des clients...</p>
        </div>
      ) : (
        <div className="mx-4 space-y-3">
          {filtres.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">👥</p>
              <p className="font-medium">Aucun client pour l'instant</p>
              <p className="text-sm mt-1">Appuyez sur + pour en ajouter un</p>
            </div>
          ) : (
            filtres.map(client => {
              const mois = moisDepuis(client.derniere_intervention);
              return (
                <div key={client.id} onClick={() => { setSelected(client); setVue('fiche'); chargerInterventionsClient(client); }}
                  className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-blue-900">{client.prenom} {client.nom}</p>
                      <p className="text-gray-500 text-sm">{client.adresse}</p>
                      <p className="text-gray-400 text-xs mt-1">{client.appareil}</p>
                    </div>
                    {mois !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full ${mois > 11 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {mois > 11 ? '⚠️ À relancer' : '✅ OK'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="fixed bottom-20 right-4">
        <button onClick={() => setVue('nouveau')}
          className="bg-orange-500 text-white rounded-full w-14 h-14 text-2xl shadow-lg flex items-center justify-center">
          +
        </button>
      </div>
      <div className="h-24" />
    </div>
  );
}