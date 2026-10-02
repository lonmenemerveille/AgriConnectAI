const axios = require('axios');
const db = require('./db');

function calculerDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat   /2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function assignerTransporteurAutomatique(commandeId) {
  const [commandes] = await db.query(
    `SELECT c.*, u.latitude AS lat_prod, u.longitude AS lng_prod
     FROM commande c
     JOIN type_commande tc ON tc.id_commande = c.id_commande
     JOIN produit p ON p.id_produit = tc.id_produit
     JOIN utilisateur u ON u.id_utilisateur = p.id_producteur
     WHERE c.id_commande = ? LIMIT 1`, [commandeId]
  );
  if (commandes.length === 0) throw new Error('Commande ou producteur introuvable.');
  const { lat_prod, lng_prod } = commandes[0];

  const [transporteurs] = await db.query(
    `SELECT t.id_utilisateur, u.latitude, u.longitude
     FROM transporteur t JOIN utilisateur u ON u.id_utilisateur = t.id_utilisateur
     WHERE t.statut_disponibilite = 'disponible'`
  );
  if (transporteurs.length === 0) throw new Error('Aucun transporteur disponible.');

  let meilleur = null, distanceMin = Infinity;
  for (const t of transporteurs) {
    const d = calculerDistanceKm(lat_prod, lng_prod, t.latitude, t.longitude);
    if (d < distanceMin) { distanceMin = d; meilleur = t; }
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${lng_prod},${lat_prod};${meilleur.longitude},${meilleur.latitude}?overview=full&geometries=geojson`;
  const routeRes = await axios.get(url);
  const route = routeRes.data.routes[0];
  const distanceKm = route.distance / 1000;
  const dureeMin = route.duration / 60;
  const coutTransport = Math.round(distanceKm * 200);

  const [trajetResult] = await db.query(
    `INSERT INTO trajet (id_transporteur, nom_zone_collecte, nom_zone_destination, cout_transport_fcfa, statut_livraison)
     VALUES (?, 'Zone producteur', 'Zone acheteur', ?, 'en_attente')`,
    [meilleur.id_utilisateur, coutTransport]
  );

  await db.query('UPDATE commande SET id_trajet = ? WHERE id_commande = ?', [trajetResult.insertId, commandeId]);

  return {
    transporteur_id: meilleur.id_utilisateur,
    distance_km: distanceKm.toFixed(1),
    duree_min: dureeMin.toFixed(0),
    cout_fcfa: coutTransport,
    itineraire: route.geometry // coordonnées GeoJSON à afficher sur une carte
  };
}

module.exports = { assignerTransporteurAutomatique, calculerDistanceKm };