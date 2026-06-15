import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const CATEGORIES = ['Carburant', 'Matériel', 'Repas', 'Outillage', 'Assurance', 'Téléphone', 'Autre'];
const PERSONNES = ['Kévin', 'Francky'];

function calculHT(montantTTC, tauxTVA) {
  return montantTTC / (1 + tauxTVA / 100);
}

function calculTVA(montantTTC, tauxTVA) {
  return montantTTC - calculHT(montantTTC, tauxTVA);
}

function formatEuro(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function debutSemaine(date) {
  const d = new Date(date);
  const jour = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - jour);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Frais() {
  const [frais, setFrais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vue, setVue] = useState('liste');
  const [periode, setPeriode] = useState('mois');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    montant_ttc: '',
    taux_tva: '20',
    categorie: CATEGORIES[0],
    personne: PERSONNES[0],
    note: '',
  });

  useEffect(() => {
    chargerFrais();
  }, []);

  async function chargerFrais() {
    setLoading(true);
    const { data, error } = await supabase
      .from('frais')
      .select('*')
      .order('date', { ascending: false });
    if (!error) setFrais(data || []);
    setLoading(false);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function ajouterFrais() {
    if (!form.date || !form.montant_ttc) {
      alert('Merci de remplir au moins la date et le montant');
      return;
    }
    const a_envoyer = {
      ...form,
      montant_ttc: parseFloat(form.montant_ttc),
      taux_tva: parseFloat(form.taux_tva),
    };
    const { data, error } = await supabase
      .from('frais')
      .insert([a_envoyer])
      .select();
    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      setFrais(prev => [data[0], ...prev]);
      setForm({ ...form, montant_ttc: '', note: '' });
      setVue('liste');
    }
  }

  async function supprimerFrais(id) {
    if (!window.confirm('Supprimer cette dépense ?')) return;
    const { error } = await supabase.from('frais').delete().eq('id', id);
    if (!error) setFrais(prev => prev.filter(f => f.id !== id));
  }

  // Calcul des périodes
  const maintenant = new Date();
  const debutSem = debutSemaine(maintenant);
  const debutMoisDate = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutAnneeDate = new Date(maintenant.getFullYear(), 0, 1);

  function dansPeriode(f, debut) {
    return new Date(f.date) >= debut;
  }

  const fraisSemaine = frais.filter(f => dansPeriode(f, debutSem));
  const fraisMois = frais.filter(f => dansPeriode(f, debutMoisDate));
  const fraisAnnee = frais.filter(f => dansPeriode(f, debutAnneeDate));

  function totaux(liste) {
    return liste.reduce((acc, f) => {
      acc.ttc += f.montant_ttc;
      acc.ht += calculHT(f.montant_ttc, f.taux_tva);
      acc.tva += calculTVA(f.montant_ttc, f.taux_tva);
      return acc;
    }, { ttc: 0, ht: 0, tva: 0 });
  }

  const totalSemaine = totaux(fraisSemaine);
  const totalMois = totaux(fraisMois);
  const totalAnnee = totaux(fraisAnnee);

  const fraisAffiches = periode === 'semaine' ? fraisSemaine : periode === 'mois' ? fraisMois : fraisAnnee;
  const totalAffiche = periode === 'semaine' ? totalSemaine : periode === 'mois' ? totalMois : totalAnnee;

  // Écran d'ajout
  if (vue === 'nouveau') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-900 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => setVue('liste')} className="text-white text-xl">←</button>
          <h1 className="text-lg font-bold">Nouvelle dépense</h1>
        </div>
        <div className="m-4 bg-white rounded-xl shadow p-4 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-semibold uppercase">Date *</label>
            <input type="date" name="date" value={form.date} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-semibold uppercase">Montant TTC (€) *</label>
            <input type="number" step="0.01" name="montant_ttc" value={form.montant_ttc} onChange={handleChange} placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-semibold uppercase">Taux de TVA</label>
            <select name="taux_tva" value={form.taux_tva} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900">
              <option value="20">20 %</option>
              <option value="10">10 %</option>
              <option value="5.5">5,5 %</option>
              <option value="0">0 %</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-semibold uppercase">Catégorie</label>
            <select name="categorie" value={form.categorie} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-semibold uppercase">Dépensé par</label>
            <div className="flex gap-2 mt-1">
              {PERSONNES.map(p => (
                <button key={p} onClick={() => setForm({ ...form, personne: p })}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition ${form.personne === p ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-500 border-gray-200'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-semibold uppercase">Note</label>
            <textarea name="note" value={form.note} onChange={handleChange} rows={2}
              placeholder="Détail de la dépense..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none" />
          </div>
        </div>
        <div className="mx-4 space-y-3">
          <button onClick={ajouterFrais} className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-lg">
            ✅ Enregistrer
          </button>
          <button onClick={() => setVue('liste')} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold">
            Annuler
          </button>
        </div>
        <div className="h-24" />
      </div>
    );
  }

  // Écran liste + récap
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-900 text-white px-4 py-4">
        <h1 className="text-xl font-bold">💶 Frais</h1>
        <p className="text-blue-200 text-sm">Suivi des dépenses</p>
      </div>

      <div className="m-4 bg-white rounded-xl shadow p-4">
        <div className="flex gap-2 mb-3">
          {[['semaine', 'Semaine'], ['mois', 'Mois'], ['annee', 'Année']].map(([id, label]) => (
            <button key={id} onClick={() => setPeriode(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${periode === id ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Total TTC</span>
            <span className="font-bold text-blue-900">{formatEuro(totalAffiche.ttc)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">dont TVA</span>
            <span className="text-gray-500">{formatEuro(totalAffiche.tva)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total HT</span>
            <span className="text-gray-500">{formatEuro(totalAffiche.ht)}</span>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 grid grid-cols-2 gap-3 text-center">
        {PERSONNES.map(p => {
          const totalPersonne = totaux(fraisAffiches.filter(f => f.personne === p)).ttc;
          return (
            <div key={p} className="bg-white rounded-xl shadow p-3">
              <p className="text-xs text-gray-400">{p}</p>
              <p className="font-bold text-blue-900">{formatEuro(totalPersonne)}</p>
            </div>
          );
        })}
      </div>

      <div className="mx-4 space-y-2">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">⏳</p>
            <p className="font-medium">Chargement...</p>
          </div>
        ) : fraisAffiches.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">💶</p>
            <p className="font-medium">Aucune dépense sur cette période</p>
          </div>
        ) : (
          fraisAffiches.map(f => (
            <div key={f.id} className="bg-white rounded-xl shadow p-3 flex justify-between items-center">
              <div>
                <p className="font-bold text-blue-900">{f.categorie}</p>
                <p className="text-gray-400 text-xs">{new Date(f.date).toLocaleDateString('fr-FR')} · {f.personne}</p>
                {f.note && <p className="text-gray-500 text-xs mt-1">{f.note}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-blue-900">{formatEuro(f.montant_ttc)}</span>
                <button onClick={() => supprimerFrais(f.id)} className="text-red-400 text-sm">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

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