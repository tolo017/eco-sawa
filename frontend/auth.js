// auth.js - client-side auth helper
const API_BASE = window.API_BASE || 'http://localhost:4000/api';
function token() { return localStorage.getItem('eco_token'); }
function setToken(t){ localStorage.setItem('eco_token', t); }
function clearToken(){ localStorage.removeItem('eco_token'); }
function authFetch(url, opts = {}) {
  opts.headers = opts.headers || {};
  if (token()) opts.headers['Authorization'] = 'Bearer ' + token();
  return fetch(url, opts);
}
async function login(email,password){
  const r = await fetch(API_BASE + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) }).then(r=>r.json());
  if (r.token) setToken(r.token);
  return r;
}
async function register(name,email,password,role){
  const r = await fetch(API_BASE + '/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password, role }) }).then(r=>r.json());
  if (r.token) setToken(r.token);
  return r;
}
