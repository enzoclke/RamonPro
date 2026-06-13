import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function NouveauRDV({ onSave, onCancel }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    client_id: '',
    date: '',
    heure: '08:00',
    duree: '45',
    creneau: 'indifferent',
    notes: '',
  });
  const [recherche, setRecherche] = useState('');
  const [etape, setEtape] = useState(1);

  useEffect(() => {
    async function chargerClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nom', { ascending: true });
      if (!error) setClients(data || []);
      setLoading(false);
    }
    chargerClients();
  }, []);

  const clientsFiltres = clients.filter(c =>
    `${c.nom} ${c.prenom}`.toLowerCase().includes(recherche.toLowerCase())
  );

  const clientSelectionne = clients.find(c => c.id === form.client_id);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit() {
    if (!form.client_id || !form.date) {
      alert('Merci de sélectionner un client et une date');
      return;
    }
    onSave({ ...form, client: clientSelectionne });
  }

  // Étape 1 — Choisir le client
  if (etape === 1) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-900 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={onCancel} className="text-white text-xl">←</button>
          <h1 className="text-lg font-bold">Nouveau RDV — Client</h1>
        </div>

        <div className="m-4">
          <input type="text" placeholder="🔍 Rechercher un client..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
            value={recherche} onChange={e => setRecherche(e.target.value)} />
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">⏳</p>
            <p>Chargement des clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-medium">Aucun client trouvé</p>
            <p className="text-sm mt-1">Ajoutez d'abord un client dans l'onglet Clients</p>
          </div>
        ) : (
          <div className="mx-4 space-y-3">
            {clientsFiltres.map(client => (
              <div key={client.id}
                onClick={() => { setForm({ ...form, client_id: client.id }); setEtape(2); }}
                className={`bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition border-2 ${form.client_id === client.id ? 'border-blue-900' : 'border-transparent'}`}>
                <p className="font-bold text-blue-900">{client.prenom} {client.nom}</p>
                <p className="text-gray-500 text-sm">{client.adresse}</p>
                <p className="text-gray-400 text-xs mt-1">{client.appareil}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Étape 2 — Détails du RDV
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-900 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => setEtape(1)} className="text-white text-xl">←</button>
        <div>
          <h1 className="text-lg font-bold">Nouveau RDV</h1>
          <p className="text-blue-200 text-sm">{clientSelectionne?.prenom} {clientSelectionne?.nom}</p>
        </div>
      </div>

      <div className="m-4 bg-white rounded-xl shadow p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Date *</label>
          <input type="date" name="date" value={form.date} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">Heure</label>
            <input type="time" name="heure" value={form.heure} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">Durée (min)</label>
            <select name="duree" value={form.duree} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900">
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
              <option value="90">90 min</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Créneau préféré</label>
          <div className="flex gap-2 mt-2">
            {[['matin', '🌅 Matin'], ['aprem', '☀️ Après-midi'], ['indifferent', '🤷 Indifférent']].map(([val, label]) => (
              <button key={val} onClick={() => setForm({ ...form, creneau: val })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition ${form.creneau === val ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-500 border-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange}
            placeholder="Code porte, chien dans le jardin..." rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none" />
        </div>
      </div>

      <div className="mx-4 space-y-3">
        <button onClick={handleSubmit} className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-lg">
          ✅ Créer le RDV
        </button>
        <button onClick={onCancel} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold">
          Annuler
        </button>
      </div>
      <div className="h-10" />
    </div>
  );
}