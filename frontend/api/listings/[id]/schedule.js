const data = require('../../_lib\data');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error:'Method not allowed' });
  const { id } = req.query || {};
  const body = req.body || {};
  const schedule = body.schedule || null;
  const out = data.scheduleListing(id, schedule);
  if(out.ok) return res.status(200).json(out);
  return res.status(400).json(out);
};