// server.js - lowdb backend + auth + web-push + IntaSend-sim
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { nanoid } = require('nanoid');
const { db, init } = require('./db');
const QRCode = require('qrcode');
const geolib = require('geolib');
const { optimizeRoute } = require('./route-optimizer');
const authRoutes = require('./auth');
const { vapidKeys, sendNearbyPush } = require('./push');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/auth', authRoutes);

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing auth' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid auth' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = payload;
    next();
  } catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
}

async function loadDB() { await init(); await db.read(); }
loadDB().catch(err => console.error('DB init error', err));

function urgencyColor(tag){
  if (!tag) return 'green';
  const t = tag.toLowerCase();
  if (t.includes('2hr') || t.includes('perishable') || t.includes('high')) return 'red';
  if (t.includes('24hr') || t.includes('stable')) return 'orange';
  return 'green';
}

/* Push endpoints */
app.post('/api/push/subscribe', requireAuth, async (req,res) => {
  await db.read();
  const sub = req.body.subscription;
  if(!sub) return res.status(400).json({ error:'No subscription' });
  const userId = req.user.id;
  db.data.rescuers = db.data.rescuers || [];
  let rescuer = db.data.rescuers.find(r => r.userId === userId);
  if(!rescuer) {
    rescuer = { id: 'rescuer_' + nanoid(6), userId, name: req.body.name || 'Rescuer', phone: null, lat: null, lon: null, pushSubscriptions: [] };
    db.data.rescuers.push(rescuer);
  }
  rescuer.pushSubscriptions = rescuer.pushSubscriptions || [];
  if (!rescuer.pushSubscriptions.find(s => s.endpoint === sub.endpoint)) rescuer.pushSubscriptions.push(sub);
  await db.write();
  res.json({ ok:true });
});

app.post('/api/push/unsubscribe', requireAuth, async (req,res)=>{
  await db.read();
  const userId = req.user.id;
  const rescuer = db.data.rescuers.find(r => r.userId === userId);
  if (rescuer && rescuer.pushSubscriptions) {
    rescuer.pushSubscriptions = rescuer.pushSubscriptions.filter(s => s.endpoint !== req.body.endpoint);
    await db.write();
  }
  res.json({ ok:true });
});

app.get('/api/push/vapidPublicKey', (req,res)=> {
  res.json({ publicKey: vapidKeys.publicKey });
});

/* Listings */
app.post('/api/listings', requireAuth, async (req,res) => {
  await db.read();
  const id = nanoid(10);
  const now = Date.now();
  const { donorId, foodType, quantityKg, category, perishabilityTag, location, timeWindow, address } = req.body;
  const color = urgencyColor(perishabilityTag);
  const qrToken = nanoid(16);
  const listing = {
    id, donorId, foodType, quantityKg, category,
    perishabilityTag, urgencyColor: color,
    lat: location?.lat || 0, lon: location?.lon || 0,
    address: address || (location?.address || ''),
    timeWindow: timeWindow || '',
    status: 'available', claimedBy: null, createdAt: now, claimedAt: null, completedAt: null, qrToken
  };
  db.data.listings.push(listing);
  await db.write();
  const qrData = await QRCode.toDataURL(JSON.stringify({ listingId: id, token: qrToken }));

  try { sendNearbyPush(db, listing, 5); } catch (e) { console.error('push notify error', e); }

  res.json({ ok:true, listing: { ...listing, qrData } });
});

app.get('/api/listings', async (req,res) => {
  await db.read();
  const order = { red: 0, orange: 1, green: 2 };
  const arr = (db.data.listings || []).filter(l => l.status === 'available').sort((a,b) => {
    if (order[a.urgencyColor] !== order[b.urgencyColor]) return order[a.urgencyColor] - order[b.urgencyColor];
    const ta = a.timeWindow ? Date.parse(a.timeWindow.split('/')[0]) : Infinity;
    const tb = b.timeWindow ? Date.parse(b.timeWindow.split('/')[0]) : Infinity;
    return ta - tb;
  });
  res.json({ ok:true, listings: arr });
});

app.post('/api/listings/:id/claim', requireAuth, async (req,res) => {
  await db.read();
  const { id } = req.params;
  const userId = req.user.id;
  const rescuer = db.data.rescuers.find(r => r.userId === userId) || db.data.rescuers.find(r => r.id === req.body.rescuerId);
  if(!rescuer) return res.status(400).json({ error:'Rescuer profile not found' });
  const listing = db.data.listings.find(l => l.id === id);
  if(!listing) return res.status(404).json({ error:'Not found' });
  if(listing.status !== 'available') return res.status(400).json({ error:'Not available' });
  listing.status = 'claimed';
  listing.claimedBy = rescuer.id;
  listing.claimedAt = Date.now();
  if(req.body.scheduledTime) listing.scheduledTime = req.body.scheduledTime;
  await db.write();
  console.log(`[NOTIFY DONOR] Listing ${id} claimed by rescuer ${rescuer.id}`);
  res.json({ ok:true, listingId: id });
});

app.post('/api/listings/:id/confirm-qr', requireAuth, async (req,res) => {
  await db.read();
  const { id } = req.params;
  const { token } = req.body;
  const userId = req.user.id;
  const rescuer = db.data.rescuers.find(r => r.userId === userId);
  if(!rescuer) return res.status(400).json({ error:'Rescuer profile not found' });
  const listing = db.data.listings.find(l => l.id === id);
  if(!listing) return res.status(404).json({ error:'Not found' });
  if(listing.claimedBy !== rescuer.id) return res.status(403).json({ error:'Listing not claimed by this rescuer' });
  if(listing.qrToken !== token) return res.status(400).json({ error:'Invalid QR token' });

  listing.status = 'completed';
  listing.completedAt = Date.now();

  const day = new Date().toISOString().slice(0,10);
  if (!db.data.impact || db.data.impact.day !== day) {
    db.data.impact = { day, totalKg: listing.quantityKg || 0, pickups: 1 };
  } else {
    db.data.impact.totalKg = (db.data.impact.totalKg || 0) + (listing.quantityKg || 0);
    db.data.impact.pickups = (db.data.impact.pickups || 0) + 1;
  }

  const donorId = listing.donorId;
  const donorListings = db.data.listings.filter(l => l.donorId === donorId);
  const total = donorListings.length;
  const successful = donorListings.filter(l => l.status === 'completed').length;
  const rep = total === 0 ? 5.0 : Number(((successful/total)*5).toFixed(2));
  const donor = (db.data.donors || []).find(d => d.id === donorId);
  if (donor) donor.reputation = rep;

  await db.write();
  res.json({ ok:true, newReputation: rep });
});

/* IntaSend simulation */
app.post('/api/intasend/createBooking', requireAuth, async (req,res) => {
  await db.read();
  const bookingId = 'sim_' + Date.now();
  const { listingId, amountKES, payer } = req.body;
  db.data.intasend_bookings.push({ id: bookingId, listingId, status: 'created', amountKES: amountKES || 0, payer: payer || 'donor', createdAt: Date.now() });
  await db.write();
  res.json({ ok:true, bookingId, status: 'created', paymentUrl: `${process.env.BASE_URL}/sim-pay/${bookingId}` });
});

app.post('/api/intasend/confirm/:bookingId', requireAuth, async (req,res) => {
  await db.read();
  const { bookingId } = req.params;
  const booking = (db.data.intasend_bookings || []).find(b => b.id === bookingId);
  if (!booking) return res.status(404).json({ error:'Booking not found' });
  booking.status = 'paid';
  await db.write();
  res.json({ ok:true, bookingId, status:'paid' });
});

app.get('/api/impact', async (req,res)=>{
  await db.read();
  const imp = db.data.impact || { day: new Date().toISOString().slice(0,10), totalKg: 0, pickups: 0 };
  res.json({ ok:true, impact: { totalKg: imp.totalKg, pickupsToday: imp.pickups } });
});

app.get('/api/listings/all', async (req,res)=>{
  await db.read();
  res.json({ ok:true, listings: db.data.listings || [] });
});

app.get('/api/rescuers', async (req,res)=>{
  await db.read();
  res.json({ ok:true, rescuers: db.data.rescuers || [] });
});

const port = process.env.PORT || 4000;
app.listen(port, ()=> console.log(`EcoSawa backend (lowdb + auth + push) running on ${port}`));
