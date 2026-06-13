// ============================================
// RAMONPRO — Algorithme d'optimisation tournées
// ============================================

// Distance entre deux points GPS (en km) — formule Haversine
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Temps de trajet estimé (minutes)
export function tempsTrajetMin(lat1, lng1, lat2, lng2) {
  const distRoute = distanceKm(lat1, lng1, lat2, lng2) * 1.3;
  return Math.round((distRoute / 70) * 60);
}

// ============================================
// K-means : regrouper par zone géo
// ============================================
function kmeans(clients, k, iterations = 20) {
  if (clients.length <= k) {
    return clients.map(c => [c]);
  }

  let centroides = clients
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, k)
    .map(c => ({ lat: c.lat, lng: c.lng }));

  let groupes = [];

  for (let iter = 0; iter < iterations; iter++) {
    groupes = Array.from({ length: k }, () => []);
    clients.forEach(client => {
      let minDist = Infinity;
      let groupe = 0;
      centroides.forEach((c, i) => {
        const d = distanceKm(client.lat, client.lng, c.lat, c.lng);
        if (d < minDist) { minDist = d; groupe = i; }
      });
      groupes[groupe].push(client);
    });

    centroides = groupes.map(groupe => {
      if (groupe.length === 0) return centroides[0];
      return {
        lat: groupe.reduce((s, c) => s + c.lat, 0) / groupe.length,
        lng: groupe.reduce((s, c) => s + c.lng, 0) / groupe.length,
      };
    });
  }

  return groupes.filter(g => g.length > 0);
}

// ============================================
// Nearest Neighbor : ordre optimal
// ============================================
function nearestNeighbor(clients, departLat, departLng) {
  const restants = [...clients];
  const ordonnes = [];
  let lat = departLat;
  let lng = departLng;

  while (restants.length > 0) {
    let minDist = Infinity;
    let indexMin = 0;
    restants.forEach((c, i) => {
      const d = distanceKm(lat, lng, c.lat, c.lng);
      if (d < minDist) { minDist = d; indexMin = i; }
    });
    const suivant = restants.splice(indexMin, 1)[0];
    ordonnes.push(suivant);
    lat = suivant.lat;
    lng = suivant.lng;
  }

  return ordonnes;
}

// ============================================
// Calcul planning horaire
// ============================================
function minutesVersHeure(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function calculerPlanning(clients, departLat, departLng) {
  const DEBUT = 8 * 60;
  const FIN = 18 * 60;
  const PAUSE_DEBUT = 12 * 60;
  const PAUSE_DUREE = 30;

  let heure = DEBUT;
  let lat = departLat;
  let lng = departLng;
  let pausePrise = false;
  const planning = [];
  const horsPlage = [];

  clients.forEach(client => {
    const trajet = tempsTrajetMin(lat, lng, client.lat, client.lng);
    heure += trajet;

    if (!pausePrise && heure >= PAUSE_DEBUT) {
      heure += PAUSE_DUREE;
      pausePrise = true;
    }

    if (heure + client.duree > FIN) {
      horsPlage.push(client);
      return;
    }

    const heureDebut = heure;
    heure += client.duree;

    planning.push({
      ...client,
      heureDebut: minutesVersHeure(heureDebut),
      heureFin: minutesVersHeure(heure),
      trajetDepuis: trajet,
    });

    lat = client.lat;
    lng = client.lng;
  });

  return { planning, horsPlage };
}

// ============================================
// FONCTION PRINCIPALE
// ============================================
export function optimiserTournees(clients, departLat, departLng, nbJours = 5) {
  const clientsValides = clients.filter(c => c.lat && c.lng);
  if (clientsValides.length === 0) return [];

  const groupes = kmeans(clientsValides, nbJours);

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const couleurs = ['#1E3A5F', '#E8720C', '#16A34A', '#9333EA', '#DC2626'];

  return groupes.map((groupe, i) => {
    const clientsOrdonnes = nearestNeighbor(groupe, departLat, departLng);
    const { planning, horsPlage } = calculerPlanning(clientsOrdonnes, departLat, departLng);

    const kmTotal = planning.reduce((total, c, idx) => {
      if (idx === 0) return total + distanceKm(departLat, departLng, c.lat, c.lng) * 1.3;
      return total + distanceKm(planning[idx - 1].lat, planning[idx - 1].lng, c.lat, c.lng) * 1.3;
    }, 0);

    return {
      jour: jours[i] || `Jour ${i + 1}`,
      couleur: couleurs[i] || '#666',
      clients: planning,
      horsPlage,
      kmTotal: Math.round(kmTotal),
      nbClients: planning.length,
    };
  });
}

// ============================================
// DATE DE NOTIFICATION
// ============================================
export function calculerDateNotification(dateIntervention) {
  const date = new Date(dateIntervention);
  date.setDate(date.getDate() - 10);
  return date.toLocaleDateString('fr-FR');
}