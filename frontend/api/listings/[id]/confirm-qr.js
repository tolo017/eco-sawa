// POST /api/listings/:id/confirm-qr
const data = require('../../_lib/data');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error:'Method not allowed' });
  const { id } = req.query || {};
  const body = req.body || {};
  const token = body.token;
  const rescuerId = (req.headers.authorization || '').replace('Bearer ', '') || undefined;
  const out = data.confirmListingWithToken(id, token, rescuerId);
  if(out.ok) return res.status(200).json(out);
  return res.status(400).json(out);
};