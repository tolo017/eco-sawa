// route-optimizer.js
// Improved nearest-neighbor route optimizer with simple time-window and perishability tie-breaker.
// Returns ordered points and total distance (km).

function toRad(v){ return v * Math.PI / 180; }

function haversineKm(a, b) {
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const aa = Math.sin(dLat/2)*Math.sin(dLat/2) +
             Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
  return R * c;
}

// Perishability priority score: lower is higher priority
function perishabilityScore(tag) {
  if (!tag) return 3;
  const t = tag.toLowerCase();
  if (t.includes('2hr') || t.includes('perishable')) return 0;
  if (t.includes('24hr') || t.includes('stable')) return 1;
  return 2;
}

// Simple time-window parse: returns earliest timestamp if present, otherwise very large
function timeWindowEarliest(ts) {
  if (!ts) return Number.MAX_SAFE_INTEGER;
  // Accept formats like "2025-08-31T10:00/2025-08-31T12:00" or single ISO
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

// points: array of { id, lat, lon, perishabilityTag?, timeWindow? }
// start: { lat, lon }
// Returns { route: [points in order], totalKm }
function optimizeRoute(start, points) {
  // defensive copy
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

  // Pre-sort by perishability and earliest time to break ties early
  remaining.sort((a,b) => {
    if (a.perishScore !== b.perishScore) return a.perishScore - b.perishScore;
    return a.timeEarliest - b.timeEarliest;
  });

  while (remaining.length) {
    // Choose nearest among top-priority subset:
    // Give preference to those with the best (lowest) perishScore.
    const bestPerish = Math.min(...remaining.map(r => r.perishScore));
    const candidates = remaining.filter(r => r.perishScore === bestPerish);

    // From candidates pick nearest (distance), break ties by earliest time
    let bestIdx = -1;
    let bestScore = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i];
      // Only consider candidate set with same perishScore first; otherwise include if none chosen
      if (!candidates.includes(r) && candidates.length) continue;
      const d = haversineKm(cur, r);
      const score = d + (r.timeEarliest / (1000*60*60*24*30)); // small influence from time (months)
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    // Fallback: if none chosen (shouldn't happen), pick first
    if (bestIdx === -1) bestIdx = 0;
    const next = remaining.splice(bestIdx, 1)[0];
    route.push(next);
    cur = { lat: next.lat, lon: next.lon };
  }

  // compute total distance
  let totalKm = 0;
  let prev = start;
  for (const p of route) {
    totalKm += haversineKm(prev, p);
    prev = p;
  }

  return { route: route.map(r => r.raw || r), totalKm: Number(totalKm.toFixed(3)) };
}

module.exports = { optimizeRoute, haversineKm };
