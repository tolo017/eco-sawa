// push.js - web-push helper
const webpush = require('web-push');
const { nanoid } = require('nanoid');

function initVapid() {
  const pub = process.env.VAPID_PUBLIC;
  const priv = process.env.VAPID_PRIVATE;
  if (pub && priv) {
    webpush.setVapidDetails('mailto:admin@ecosawa.org', pub, priv);
    return { publicKey: pub, privateKey: priv };
  }
  const keys = webpush.generateVAPIDKeys();
  webpush.setVapidDetails('mailto:admin@ecosawa.org', keys.publicKey, keys.privateKey);
  return keys;
}

const vapidKeys = initVapid();

async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('Push send failed', err && err.body ? err.body : err);
    return false;
  }
}

function sendNearbyPush(db, listing, radiusKm = 5) {
  const geolib = require('geolib');
  const subs = [];
  (db.data.rescuers || []).forEach(r => {
    if (!r.lat || !r.lon || !r.pushSubscriptions) return;
    const d = geolib.getDistance({ latitude: listing.lat, longitude: listing.lon }, { latitude: r.lat, longitude: r.lon });
    if (d <= radiusKm * 1000) {
      r.pushSubscriptions.forEach(s => subs.push({ subscription: s, rescuerId: r.id }));
    }
  });
  const payload = {
    title: 'New Pickup Nearby',
    body: `${listing.quantityKg}kg ${listing.foodType} (${listing.perishabilityTag})`,
    url: process.env.BASE_URL || 'http://localhost:4000'
  };
  subs.forEach(async s => {
    await sendPush(s.subscription, payload);
  });
}

module.exports = { vapidKeys, sendPush, sendNearbyPush };
