// route-optimizer.js - nearest-neighbor heuristic
function toRad(v){ return v * Math.PI / 180; }
function distance(a,b){
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const aa = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
  return R * c;
}

function optimizeRoute(start, points){
  // start {lat, lon}, points [{id, lat, lon}]
  const pts = points.map(p => ({...p, lat: Number(p.lat), lon: Number(p.lon)}));
  const route = [];
  let cur = {lat: start.lat, lon: start.lon};
  const remaining = pts.slice();
  while(remaining.length){
    let bestIdx = 0, bestD = Infinity;
    for(let i=0;i<remaining.length;i++){
      const d = distance(cur, remaining[i]);
      if(d < bestD){ bestD = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx,1)[0];
    route.push(next);
    cur = next;
  }
  return route;
}

module.exports = { optimizeRoute, distance };
