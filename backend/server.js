// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { nanoid } = require('nanoid');
const db = require('./db');
const QRCode = require('qrcode');
const { optimizeRoute } = require('./route-optimizer');
const geolib = require('geolib');

const app = express();
app.use(cors());
app.use(bodyParser.json());

function urgencyColor(tag){
  if (!tag) return 'green';
  const t = tag.toLowerCase();
  if (t.includes('2hr') || t.includes('perishable')) return 'red';
  if (t.includes('24hr') || t.includes('stable')) return 'orange';
  return 'green';
}

/* Donors */
app.post('/api/donors', (req,res)=>{
  const { id, name, phone } = req.body;
  const did = id || nanoid(8);
  db.prepare('INSERT OR REPLACE INTO donors(id,name,phone) VALUES(?,?,?)').run(did, name || `Donor ${did}`, phone || null);
  const donor = db.prepare('SELECT * FROM donors WHERE id=?').get(did);
  res.json({ ok:true, donor });
});

app.get('/api/donors/:id/reputation', (req,res)=>{
  const donorId = req.params.id;
  const donor = db.prepare('SELECT * FROM donors WHERE id=?').get(donorId);
  if(!donor) return res.status(404).json({ error:'donor not found' });
  res.json({ ok:true, reputation: donor.reputation });
});

/* Rescuers */
app.post('/api/rescuers', (req,res)=>{
  const { id, name, phone, location } = req.body;
  const rid = id || nanoid(8);
  const lat = location?.lat || null;
  const lon = location?.lon || null;
  db.prepare('INSERT OR REPLACE INTO rescuers(id,name,phone,lat,lon) VALUES(?,?,?,?,?)').run(rid, name || `Rescuer ${rid}`, phone || null, lat, lon);
  const rescuer = db.prepare('SELECT * FROM rescuers WHERE id=?').get(rid);
  res.json({ ok:true, rescuer });
});

/* Listings - create with QR token */
app.post('/api/listings', async (req,res)=>{
  const id = nanoid(10);
  const now = Date.now();
  const { donorId, foodType, quantityKg, category, perishabilityTag, location, timeWindow, address } = req.body;
  const color = urgencyColor(perishabilityTag);
  const qrToken = nanoid(16);
  db.prepare(`INSERT INTO listings(id, donorId, foodType, quantityKg, category, perishabilityTag, urgencyColor, lat, lon, address, timeWindow, status, createdAt, qrToken)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, donorId, foodType, quantityKg, category, perishabilityTag, color, location?.lat || 0, location?.lon || 0, address || (location?.address || ''), timeWindow || '', 'available', now, qrToken);
  const qrData = await QRCode.toDataURL(JSON.stringify({ listingId: id, token: qrToken }));
  res.json({ ok:true, listing: { id, donorId, foodType, quantityKg, category, perishabilityTag, urgencyColor: color, location, address, qrData, qrToken } });
});

/* Get available listings */
app.get('/api/listings', (req,res)=>{
  const rows = db.prepare('SELECT * FROM listings WHERE status = "available"').all();
  res.json({ ok:true, listings: rows });
});

/* Claim listing */
app.post('/api/listings/:id/claim', (req,res)=>{
  const { id } = req.params;
  const { rescuerId } = req.body;
  const listing = db.prepare('SELECT * FROM listings WHERE id=?').get(id);
  if(!listing) return res.status(404).json({ error:'Not found' });
  if(listing.status !== 'available') return res.status(400).json({ error:'Not available' });
  db.prepare('UPDATE listings SET status=?, claimedBy=?, claimedAt=? WHERE id=?').run('claimed', rescuerId, Date.now(), id);
  res.json({ ok:true, listingId: id });
});

/* Confirm pickup via QR token */
app.post('/api/listings/:id/confirm-qr', (req,res)=>{
  const { id } = req.params;
  const { rescuerId, token } = req.body;
  const listing = db.prepare('SELECT * FROM listings WHERE id=?').get(id);
  if(!listing) return res.status(404).json({ error:'Not found' });
  if(listing.claimedBy !== rescuerId) return res.status(403).json({ error:'Listing not claimed by rescuer' });
  if(listing.qrToken !== token) return res.status(400).json({ error:'Invalid QR token' });

  db.prepare('UPDATE listings SET status=?, completedAt=? WHERE id=?').run('completed', Date.now(), id);

  // Update impact for today
  const day = new Date().toISOString().slice(0,10);
  const imp = db.prepare('SELECT * FROM impact WHERE day=?').get(day);
  if(imp) {
    db.prepare('UPDATE impact SET totalKg = totalKg + ?, pickups = pickups + 1 WHERE day = ?').run(listing.quantityKg || 0, day);
  } else {
    db.prepare('INSERT INTO impact(day,totalKg,pickups) VALUES(?,?,?)').run(day, listing.quantityKg || 0, 1);
  }

  // Update donor reputation
  const donorId = listing.donorId;
  const total = db.prepare('SELECT COUNT(*) as c FROM listings WHERE donorId=?').get(donorId).c;
  const successful = db.prepare('SELECT COUNT(*) as c FROM listings WHERE donorId=? AND status="completed"').get(donorId).c;
  const rep = total === 0 ? 5.0 : Number(((successful/total)*5).toFixed(2));
  db.prepare('UPDATE donors SET reputation=? WHERE id=?').run(rep, donorId);

  res.json({ ok:true, newReputation: rep });
});

/* Impact */
app.get('/api/impact', (req,res)=>{
  const row = db.prepare('SELECT day, totalKg, pickups FROM impact ORDER BY day DESC LIMIT 1').get();
  res.json({ ok:true, impact: { totalKg: row ? row.totalKg : 0, pickupsToday: row ? row.pickups : 0 } });
});

/* Simulated IntaSend create booking */
app.post('/api/intasend/createBooking', (req,res)=>{
  const bookingId = 'sim_' + Date.now();
  const { listingId, amountKES } = req.body;
  db.prepare('INSERT INTO intasend_bookings(id, listingId, status, amountKES, createdAt) VALUES(?,?,?,?,?)')
    .run(bookingId, listingId, 'created', amountKES || 0, Date.now());
  res.json({ ok:true, bookingId, status: 'created', paymentUrl: `${process.env.BASE_URL}/sim-pay/${bookingId}` });
});

/* Simulate payment confirmation */
app.post('/api/intasend/confirm/:bookingId', (req,res)=>{
  const { bookingId } = req.params;
  const booking = db.prepare('SELECT * FROM intasend_bookings WHERE id=?').get(bookingId);
  if(!booking) return res.status(404).json({ error:'Booking not found' });
  db.prepare('UPDATE intasend_bookings SET status=? WHERE id=?').run('paid', bookingId);
  res.json({ ok:true, bookingId, status:'paid' });
});

/* Route optimizer */
app.post('/api/route/optimize', (req,res)=>{
  const { rescuerLocation, listingIds } = req.body;
  if(!rescuerLocation || !Array.isArray(listingIds)) return res.status(400).json({ error:'Bad payload' });
  const placeholders = listingIds.map(()=>'?').join(',');
  const rows = db.prepare(`SELECT id, lat, lon FROM listings WHERE id IN (${placeholders})`).all(...listingIds);
  const pts = rows.map(r => ({ id: r.id, lat: r.lat, lon: r.lon }));
  const route = optimizeRoute({ lat: rescuerLocation.lat, lon: rescuerLocation.lon }, pts);
  res.json({ ok:true, route });
});

/* Nearby rescuers (for SMS simulation) */
app.get('/api/rescuers/nearby', (req,res)=>{
  const lat = Number(req.query.lat), lon = Number(req.query.lon), radiusKm = Number(req.query.radiusKm) || 5;
  const all = db.prepare('SELECT * FROM rescuers WHERE lat IS NOT NULL').all();
  const nearby = all.filter(r => {
    const d = geolib.getDistance({latitude: lat, longitude: lon}, {latitude: r.lat, longitude: r.lon});
    return d <= radiusKm * 1000;
  });
  res.json({ ok:true, rescuers: nearby });
});

/* Debug listing all */
app.get('/api/listings/all', (req,res)=>{
  const rows = db.prepare('SELECT * FROM listings').all();
  res.json({ ok:true, listings: rows });
});

const port = process.env.PORT || 4000;
app.listen(port, ()=> console.log(`EcoSawa backend (sqlite) running on ${port}`));
