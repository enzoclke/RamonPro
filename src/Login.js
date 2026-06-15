import React, { useState } from 'react';
import { supabase } from './supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreur('Email ou mot de passe incorrect');
    setChargement(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-blue-900 mb-1">🧹 RamonPro</h1>
        <p className="text-gray-500 text-sm mb-4">Connexion</p>
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2" required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2" required />
          {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
          <button type="submit" disabled={chargement}
            className="w-full bg-blue-900 text-white py-2 rounded-lg font-semibold">
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}