// auth.js - register/login with bcrypt & JWT
const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./db');
const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  await db.read();
  const { name, email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  if (db.data.users && db.data.users.find(u => u.email === email)) return res.status(400).json({ error: 'email exists' });
  const id = 'user_' + nanoid(8);
  const hash = bcrypt.hashSync(password, 8);
  db.data.users = db.data.users || [];
  const user = { id, name: name || email, email, password: hash, role: role || 'rescuer' };
  db.data.users.push(user);
  await db.write();
  const token = signToken(user);
  res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/login', async (req, res) => {
  await db.read();
  const { email, password } = req.body;
  const user = (db.data.users || []).find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

module.exports = router;
