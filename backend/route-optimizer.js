// route-optimizer.js
function toRad(v){ return v * Math.PI / 180; }

function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const aa = Math.sin(dLat/2)*Math.sin(dLat/2) +
             Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
  return R * c;
}

function perishabilityScore(tag) {
  if (!tag) return 3;
  const t = tag.toLowerCase();
  if (t.includes('2hr') || t.includes('perishable') || t.includes('high')) return 0;
  if (t.includes('24hr') || t.includes('stable')) return 1;
  return 2;
}

function timeWindowEarliest(ts) {
  if (!ts) return Number.MAX_SAFE_INTEGER;
  try {
    if (ts.includes('/')) {
      const parts = ts.split('/');
      const start = Date.parse(parts[0]);
      return isNaN(start) ? Number.MAX_SAFE_INTEGER : start;
    }
    const t = Date.parse(ts);
    return isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function optimizeRoute(start, points) {
  const pts = (points || []).map(p => ({
    id: p.id,
    lat: Number(p.lat),
    lon: Number(p.lon),
    perishScore: perishabilityScore(p.perishabilityTag),
    timeEarliest: timeWindowEarliest(p.timeWindow),
    raw: p
  }));

  const route = [];
  let cur = { lat: start.lat, lon: start.lon };
  const remaining = pts.slice();

  remaining.sort((a,b) => {
    if (a.perishScore !== b.perishScore) return a.perishScore - b.perishScore;
    return a.timeEarliest - b.timeEarliest;
  });

  while (remaining.length) {
    const bestPerish = Math.min(...remaining.map(r => r.perishScore));
    const candidates = remaining.filter(r => r.perishScore === bestPerish);

    let bestIdx = -1;
    let bestScore = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i];
      if (!candidates.includes(r) && candidates.length) continue;
      const d = haversineKm(cur, r);
      const score = d + (r.timeEarliest / (1000*60*60*24*30));
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) bestIdx = 0;
    const next = remaining.splice(bestIdx, 1)[0];
    route.push(next);
    cur = { lat: next.lat, lon: next.lon };
  }

  let totalKm = 0;
  let prev = start;
  for (const p of route) {
    totalKm += haversineKm(prev, p);
    prev = p;
  }

  return { route: route.map(r => r.raw || r), totalKm: Number(totalKm.toFixed(3)) };
}

module.exports = { optimizeRoute, haversineKm };
