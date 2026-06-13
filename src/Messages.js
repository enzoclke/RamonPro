import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { envoyerEmailsMasse } from './brevo';

function moisDepuis(date) {
  if (!date) return null;
  const diff = new Date() - new Date(date);
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
}

const templates = [
  {
    id: 1,
    label: '🔔 Rappel annuel',
    sujet: 'Il est temps de ramoner !',
    message: 'Bonjour {prenom},\n\nNous vous rappelons que votre ramonage annuel est à prévoir. N\'hésitez pas à nous contacter pour fixer un rendez-vous.\n\nCordialement,\nVotre ramoneur',
  },
  {
    id: 2,
    label: '📅 Confirmation RDV',
    sujet: 'Confirmation de votre rendez-vous',
    message: 'Bonjour {prenom},\n\nNous confirmons votre rendez-vous de ramonage. Nous serons chez vous à l\'heure convenue.\n\nCordialement,\nVotre ramoneur',
  },
  {
    id: 3,
    label: '📄 Certificat disponible',
    sujet: 'Votre certificat de ramonage',
    message: 'Bonjour {prenom},\n\nVotre certificat de ramonage est disponible en pièce jointe.\n\nCordialement,\nVotre ramoneur',
  },
];

export default function Messages() {
  const [onglet, setOnglet] = useState('relances');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templateSelectionne, setTemplateSelectionne] = useState(0);
  const [selectionnes, setSelectionnes] = useState([]);
  const [envoi, setEnvoi] = useState({ en_cours: false, resultat: null });
  const [filtre, setFiltre] = useState('tous');

  useEffect(() => {
    async function charger() {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nom', { ascending: true });
      if (!error) setClients(data || []);
      setLoading(false);
    }
    charger();
  }, []);

  const clientsAvecStatut = clients.map(c => ({
    ...c,
    mois: moisDepuis(c.derniere_intervention),
  }));

  const aRelancer = clientsAvecStatut.filter(c => c.mois === null || c.mois >= 10);
  const aJour = clientsAvecStatut.filter(c => c.mois !== null && c.mois < 10);
  const clientsAffiches = filtre === 'relancer' ? aRelancer : filtre === 'ok' ? aJour : clientsAvecStatut;

  function toggleClient(id) {
    setSelectionnes(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  function toutSelectionner() {
    setSelectionnes(
      selectionnes.length === aRelancer.length ? [] : aRelancer.map(c => c.id)
    );
  }

  async function envoyer() {
    const clientsChoisis = clientsAvecStatut.filter(c => selectionnes.includes(c.id));
    const template = templates[templateSelectionne];

    setEnvoi({ en_cours: true, resultat: null });

    const resultats = await envoyerEmailsMasse(clientsChoisis, template);

    setEnvoi({ en_cours: false, resultat: resultats });
    setSelectionnes([]);

    setTimeout(() => setEnvoi({ en_cours: false, resultat: null }), 5000);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-blue-900 text-white px-4 py-4">
        <h1 className="text-xl font-bold">📧 Messages</h1>
        <p className="text-blue-200 text-sm">Relances & automatismes</p>
      </div>

      <div className="flex bg-white border-b border-gray-100">
        {[['relances', '🔔 Relances'], ['templates', '✏️ Templates'], ['automatismes', '🤖 Automatismes']].map(([id, label]) => (
          <button key={id} onClick={() => setOnglet(id)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${onglet === id ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {onglet === 'relances' && (
        <div className="m-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl shadow p-3 text-center cursor-pointer" onClick={() => setFiltre('tous')}>
              <p className="text-xl font-bold text-blue-900">{clientsAvecStatut.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-red-50 rounded-xl shadow p-3 text-center cursor-pointer" onClick={() => setFiltre('relancer')}>
              <p className="text-xl font-bold text-red-500">{aRelancer.length}</p>
              <p className="text-xs text-gray-500">À relancer</p>
            </div>
            <div className="bg-green-50 rounded-xl shadow p-3 text-center cursor-pointer" onClick={() => setFiltre('ok')}>
              <p className="text-xl font-bold text-green-600">{aJour.length}</p>
              <p className="text-xs text-gray-500">À jour</p>
            </div>
          </div>

          <div className="flex gap-2">
            {[['tous', 'Tous'], ['relancer', '⚠️ À relancer'], ['ok', '✅ À jour']].map(([val, label]) => (
              <button key={val} onClick={() => setFiltre(val)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${filtre === val ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-500 border-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{clientsAffiches.length} client(s)</p>
            {filtre !== 'ok' && (
              <button onClick={toutSelectionner} className="text-sm text-blue-900 font-semibold">
                {selectionnes.length === aRelancer.length ? 'Désélectionner tout' : 'Tout sélectionner'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">⏳</p>
              <p>Chargement...</p>
            </div>
          ) : clientsAffiches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">👥</p>
              <p className="font-medium">Aucun client dans cette catégorie</p>
            </div>
          ) : (
            clientsAffiches.map(client => (
              <div key={client.id} onClick={() => toggleClient(client.id)}
                className={`bg-white rounded-xl shadow p-4 cursor-pointer border-2 transition ${selectionnes.includes(client.id) ? 'border-blue-900' : 'border-transparent'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-bold text-blue-900">{client.prenom} {client.nom}</p>
                    <p className="text-gray-500 text-sm">{client.email || '⚠️ Pas d\'email'}</p>
                    {client.mois !== null ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${client.mois >= 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {client.mois >= 10 ? `⚠️ ${client.mois} mois sans intervention` : `✅ ${client.mois} mois — OK`}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Jamais intervenu</span>
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${selectionnes.includes(client.id) ? 'bg-blue-900 border-blue-900' : 'border-gray-300'}`}>
                    {selectionnes.includes(client.id) && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              </div>
            ))
          )}

          {selectionnes.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <p className="font-semibold text-blue-900">Template à envoyer</p>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={templateSelectionne}
                onChange={e => setTemplateSelectionne(Number(e.target.value))}>
                {templates.map((t, i) => (
                  <option key={t.id} value={i}>{t.label}</option>
                ))}
              </select>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-semibold mb-1">Aperçu</p>
                <p className="text-xs text-gray-700 whitespace-pre-line">
                  {templates[templateSelectionne].message
                    .replace('{prenom}', clientsAvecStatut.find(c => selectionnes.includes(c.id))?.prenom || 'Client')
                    .replace('{nom}', clientsAvecStatut.find(c => selectionnes.includes(c.id))?.nom || '')}
                </p>
              </div>
              <button onClick={envoyer} disabled={envoi.en_cours}
                className={`w-full py-3 rounded-xl font-semibold text-white transition ${envoi.en_cours ? 'bg-gray-400' : 'bg-orange-500'}`}>
                {envoi.en_cours ? '⏳ Envoi en cours...' : `📨 Envoyer à ${selectionnes.length} client${selectionnes.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {envoi.resultat && (
            <div className={`rounded-xl p-4 border ${envoi.resultat.succes > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`font-semibold ${envoi.resultat.succes > 0 ? 'text-green-700' : 'text-red-700'}`}>
                ✅ {envoi.resultat.succes} email(s) envoyé(s)
                {envoi.resultat.echecs > 0 && ` · ⚠️ ${envoi.resultat.echecs} échec(s)`}
              </p>
              {envoi.resultat.erreurs.length > 0 && (
                <div className="mt-2">
                  {envoi.resultat.erreurs.map((e, i) => (
                    <p key={i} className="text-red-500 text-xs">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {onglet === 'templates' && (
        <div className="m-4 space-y-3">
          <p className="text-sm text-gray-400">Templates d'emails disponibles</p>
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow p-4">
              <p className="font-bold text-blue-900">{t.label}</p>
              <p className="text-gray-500 text-sm mt-1">Sujet : {t.sujet}</p>
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <p className="text-xs text-gray-600 whitespace-pre-line">{t.message.replace('{prenom}', 'Michel').replace('{nom}', 'Dupont')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {onglet === 'automatismes' && (
        <div className="m-4 space-y-3">
          <p className="text-sm text-gray-400">Déclencheurs automatiques</p>
          {[
            { label: 'Rappel annuel automatique', desc: 'Envoi auto 2 mois avant l\'anniversaire de la dernière intervention', actif: true, badge: `${aRelancer.length} clients concernés` },
            { label: 'Confirmation de RDV', desc: 'Email envoyé automatiquement lors de la création d\'un RDV', actif: true, badge: null },
            { label: 'Certificat post-intervention', desc: 'Envoi automatique du certificat PDF après une intervention réalisée', actif: false, badge: null },
            { label: 'Alerte client inactif', desc: 'Notification si un client dépasse 18 mois sans intervention', actif: true, badge: `${clientsAvecStatut.filter(c => c.mois >= 18).length} clients` },
          ].map((auto, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-blue-900 text-sm">{auto.label}</p>
                    {auto.badge && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{auto.badge}</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{auto.desc}</p>
                </div>
                <div className={`w-12 h-6 rounded-full flex items-center px-1 transition flex-shrink-0 ${auto.actif ? 'bg-blue-900' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${auto.actif ? 'translate-x-6' : ''}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}