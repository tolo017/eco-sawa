// shared in-memory demo data for serverless lambdas (persist per warm instance)
const randBetween = (min, max) => Math.random() * (max - min) + min;
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
    qrToken: 'IS_' + Math.random().toString(36).slice(2,9),
    claimedBy: null,
    confirmed: false,
    schedule: null
  };
}

if (!global.__eco_listings) {
  global.__eco_listings = Array.from({length:12}, (_,i)=>makeListing(i+1));
}
if (!global.__eco_transactions) global.__eco_transactions = [];
const makeTxId = () => 'tx_' + Date.now().toString(36).slice(2,9);

module.exports = {
  getListings: () => global.__eco_listings.filter(l => l.status !== 'deleted'),
  getAll: () => global.__eco_listings,
  createListing: (body) => {
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
      confirmed: false,
      schedule: null
    };
    global.__eco_listings.push(listing);
    return listing;
  },
  claimListing: (id, token) => {
    const l = global.__eco_listings.find(x=>x.id===id);
    if(!l) return { ok:false, error:'Not found' };
    if(l.claimedBy) return { ok:false, error:'Already claimed' };
    l.claimedBy = token || ('rescuer_' + Date.now().toString(36).slice(2,6));
    l.status = 'claimed';
    return { ok:true, claimed:true, listing: l };
  },
  scheduleListing: (id, scheduleStr) => {
    const l = global.__eco_listings.find(x=>x.id===id);
    if(!l) return { ok:false, error:'Not found' };
    l.schedule = scheduleStr;
    return { ok:true, listing: l };
  },
  confirmListingWithToken: (id, token, rescuerId){
    const l = global.__eco_listings.find(x=>x.id===id);
    if(!l) return { ok:false, error:'Not found' };
    if(l.qrToken){
      if(token && token === l.qrToken){
        l.confirmed = true; l.status = 'collected';
      } else return { ok:false, error:'Invalid token' };
    } else {
      l.confirmed = true; l.status='collected';
    }
    // record a simple transaction (simulated InstaSend)
    const tx = { id: makeTxId(), listingId: l.id, donorId: l.donorId, rescuerId: rescuerId || l.claimedBy || 'unknown', tokenUsed: token || null, time: new Date().toISOString(), amount: 0 };
    global.__eco_transactions.push(tx);
    return { ok:true, transaction: tx };
  },
  getTransactions: () => global.__eco_transactions
};