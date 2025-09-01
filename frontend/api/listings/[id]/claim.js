// POST /api/listings/:id/claim
const data = require('../../_lib/data');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error:'Method not allowed' });
  const { id } = req.query || req.params || {};
  const token = (req.headers.authorization || '').replace('Bearer ', '') || undefined;
  const out = data.claimListing(id, token);
  if(out.ok) return res.status(200).json(out);
  return res.status(400).json(out);
};