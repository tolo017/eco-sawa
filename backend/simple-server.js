const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

const PORT = process.env.PORT || 4000;

function randBetween(min, max){ return Math.random() * (max - min) + min; }
function makeListing(i){
  const types = ['Vegetables','Cooked Meals','Fruits','Bread','Dairy'];
  const perTags = ['Fresh','Perishable','Non-perishable'];
  const urg = ['green','orange','red'];
  const lat = randBetween(-1.55, -0.95);
  const lon = randBetween(36.55, 37.35);
  return {
    id: 'sim-' + i,
    donorId: 'donor_sim_' + (1000 + i),
    foodType: types[i % types.length],
    quantityKg: Math.ceil(randBetween(1, 30)),
    category: (i % 3) === 0 ? 'Prepared' : (i % 3) === 1 ? 'Produce' : 'Packaged',
    perishabilityTag: perTags[i % perTags.length],
    urgencyColor: urg[i % urg.length],
    lat, lon,
    address: `Simulated addr ${i+1}, Nairobi/Kiambu`,
    timeWindow: ['ASAP','Today 9-11','Today 12-14'][i % 3],
    status: 'available',
    qrToken: null,
    claimedBy: null,
    confirmed: false
  };
}

let listings = Array.from({length:12}, (_,i)=>makeListing(i+1));

// API: list available
app.get('/api/listings', (req, res) => {
  res.json({ listings: listings.filter(l=>l.status!=='deleted' ) });
});
// API: all (for rescuer optimization / my pickups)
app.get('/api/listings/all', (req, res) => {
  res.json({ listings });
});

// Create listing (donor)
app.post('/api/listings', (req, res) => {
  const body = req.body || {};
  const id = 'L' + Date.now().toString(36).slice(2,8);
  const listing = {
    id,
    donorId: body.donorId || ('donor_' + Math.random().toString(36).slice(2,8)),
    foodType: body.foodType || 'Surplus',
    quantityKg: Number(body.quantityKg) || 0,
    category: body.category || 'Prepared',
    perishabilityTag: body.perishabilityTag || 'Non-Perishable',
    lat: (body.location && body.location.lat) || randBetween(-1.55, -0.95),
    lon: (body.location && body.location.lon) || randBetween(36.55, 37.35),
    address: (body.location && body.location.address) || body.address || '',
    timeWindow: body.timeWindow || '',
    status: 'available',
    qrToken: 'IS_' + Math.random().toString(36).slice(2,9),
    claimedBy: null,
    confirmed: false
  };
  listings.push(listing);
  res.json({ ok:true, listing: { id: listing.id, qrToken: listing.qrToken, qrData: '' } });
});

// Claim listing (rescuer)
app.post('/api/listings/:id/claim', (req, res) => {
  const id = req.params.id;
  const token = (req.headers.authorization || '').replace('Bearer ','') || 'demo-rescuer';
  const l = listings.find(x=>x.id===id);
  if(!l) return res.status(404).json({ ok:false, error:'Not found' });
  if(l.claimedBy) return res.json({ ok:false, error:'Already claimed' });
  l.claimedBy = token;
  l.status = 'claimed';
  res.json({ ok:true, claimed:true });
});

// Confirm via QR (donor gives token to rescuer)
app.post('/api/listings/:id/confirm-qr', (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const l = listings.find(x=>x.id===id);
  if(!l) return res.status(404).json({ ok:false, error:'Not found' });
  if(l.qrToken){
    if(body.token && body.token === l.qrToken){
      l.confirmed = true;
      l.status = 'collected';
      return res.json({ ok:true });
    } else return res.json({ ok:false, error:'Invalid token' });
  } else {
    l.confirmed = true;
    l.status = 'collected';
    return res.json({ ok:true });
  }
});

// Fallback to serve index if user navigates to /
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Simple server running on http://localhost:${PORT} — serving ${FRONTEND_DIR}`);
});