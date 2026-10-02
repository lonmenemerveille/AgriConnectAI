const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const ENTETES = { 'User-Agent': 'AgriConnectAI/1.0 (projet BTS IAI-Cameroun)' };

// "Bafoussam" -> { lat, lng }, limité au Cameroun
async function geocoder(adresse) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(adresse)}&countrycodes=cm&format=json&limit=1`;
  const rep = await fetch(url, { headers: ENTETES });
  const data = await rep.json();
  if (!data.length) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

// Distance (km) et durée (min) par la route. Renvoie null si OSRM ne répond pas.
async function itineraire(a, b) {
  try {
    const url = `${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
    const rep = await fetch(url, { headers: ENTETES });
    const data = await rep.json();
    if (data.code !== 'Ok') return null;
    const r = data.routes[0];
    return { distance_km: r.distance / 1000, duree_min: Math.round(r.duration / 60) };
  } catch {
    return null;
  }
}

module.exports = { geocoder, itineraire };