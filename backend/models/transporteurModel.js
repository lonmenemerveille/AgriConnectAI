const { distanceKm } = require('../utils/geo');
const geo = require('../services/geoService');

const PRIX_DE_BASE = 500; // FCFA

async function coordonnees(conn, idUtilisateur) {
  const [[u]] = await conn.query(
    'SELECT latitude, longitude FROM utilisateur WHERE id_utilisateur = ?', [idUtilisateur]);
  return u && u.latitude != null ? { lat: Number(u.latitude), lng: Number(u.longitude) } : null;
}

// 1) filtre Haversine (3 plus proches)  2) distance routière OSRM  3) meilleur choix
async function plusProche(conn, idProducteur, idAcheteur) {
  const prod = await coordonnees(conn, idProducteur);
  const ach = await coordonnees(conn, idAcheteur);
  if (!prod || !ach) return null;

  const [liste] = await conn.query(
    `SELECT t.id_transporteur, t.tarif_km, u.latitude, u.longitude
       FROM transporteur t
       JOIN utilisateur u ON u.id_utilisateur = t.id_transporteur
      WHERE t.disponible = 1 AND u.latitude IS NOT NULL`);

  const candidats = liste
    .map((t) => ({
      ...t,
      pos: { lat: Number(t.latitude), lng: Number(t.longitude) },
      vol: distanceKm(prod.lat, prod.lng, Number(t.latitude), Number(t.longitude)),
    }))
    .sort((x, y) => x.vol - y.vol)
    .slice(0, 3);
  if (!candidats.length) return null;

  let meilleur = null;
  for (const t of candidats) {
    const route = await geo.itineraire(t.pos, prod);
    const km = route ? route.distance_km : t.vol; // repli : vol d'oiseau
    if (!meilleur || km < meilleur.km) meilleur = { ...t, km };
  }

  const trajet = await geo.itineraire(prod, ach);
  const kmLivraison = trajet ? trajet.distance_km : distanceKm(prod.lat, prod.lng, ach.lat, ach.lng);

  return {
    id_transporteur: meilleur.id_transporteur,
    distance_km: Math.round(meilleur.km * 10) / 10,
    cout_transport: Math.round(PRIX_DE_BASE + kmLivraison * meilleur.tarif_km),
  };
}

// Le transporteur met à jour sa position (suivi en direct)
async function majPosition(db, idTransporteur, lat, lng) {
  await db.query(
    'UPDATE utilisateur SET latitude = ?, longitude = ? WHERE id_utilisateur = ?',
    [lat, lng, idTransporteur]);
}

module.exports = { plusProche, majPosition };