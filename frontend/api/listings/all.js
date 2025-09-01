// GET /api/listings/all
const data = require('../_lib/data');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error:'Method not allowed' });
  return res.status(200).json({ listings: data.getAll() });
};