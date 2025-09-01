const data = require('./_lib/data');

function svgDataUrlForToken(token){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='100%' height='100%' fill='#fff'/><text x='10' y='150' font-size='18' font-family='sans-serif'>${token}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ listings: data.getListings() });
  }
  if (req.method === 'POST') {
    const body = req.body || {};
    const listing = data.createListing(body);
    return res.status(200).json({ ok:true, listing: { id: listing.id, qrToken: listing.qrToken, qrData: svgDataUrlForToken(listing.qrToken) } });
  }
  res.status(405).json({ error: 'Method not allowed' });
};