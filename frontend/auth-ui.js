// auth-ui.js - injects a modal sign-in/register UI and exposes helpers
(function(){
  // inject styles
  const css = `
  .es-modal-backdrop{position:fixed;inset:0;background:rgba(2,6,23,0.45);display:flex;align-items:center;justify-content:center;z-index:9999}
  .es-modal{width:360px;background:white;border-radius:12px;padding:16px;box-shadow:0 10px 30px rgba(2,6,23,0.2)}
  .es-modal h3{margin:0 0 8px 0;font-size:1.05rem}
  .es-modal .row{margin-bottom:8px}
  .es-modal input{width:100%;padding:8px;border:1px solid #e6eef9;border-radius:8px}
  .es-modal .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
  .es-modal .note{font-size:0.85rem;color:#6b7280;margin-top:6px}
  `;
  const s = document.createElement('style'); s.innerText = css; document.head.appendChild(s);

  // build modal
  function buildModal() {
    if (document.getElementById('esAuthModal')) return;
    const back = document.createElement('div'); back.className = 'es-modal-backdrop'; back.id = 'esAuthBackdrop';
    back.innerHTML = `
      <div class="es-modal" id="esAuthModal">
        <h3 id="esAuthTitle">Sign in</h3>
        <div class="row"><input id="esEmail" placeholder="Email" type="email"/></div>
        <div class="row"><input id="esPassword" placeholder="Password" type="password"/></div>
        <div class="row" id="esNameRow" style="display:none"><input id="esName" placeholder="Full name"/></div>
        <div class="actions">
          <button id="esCancel" class="btn ghost">Cancel</button>
          <button id="esSubmit" class="btn">Continue</button>
        </div>
        <div class="note" id="esNote">Use demo: donor@example.com / password or rescuer@example.com / password</div>
      </div>
    `;
    back.style.display = 'none';
    document.body.appendChild(back);

    document.getElementById('esCancel').onclick = ()=> { back.style.display='none'; };
  }

  buildModal();

  let mode = 'login'; // or 'register'
  function showAuthModal(m = 'login') {
    mode = m;
    document.getElementById('esAuthBackdrop').style.display = 'flex';
    document.getElementById('esAuthTitle').innerText = m === 'login' ? 'Sign in' : 'Register';
    document.getElementById('esNameRow').style.display = m === 'register' ? 'block' : 'none';
    document.getElementById('esEmail').value = '';
    document.getElementById('esPassword').value = '';
    document.getElementById('esName').value = '';
  }

  async function submitAuth() {
    const email = document.getElementById('esEmail').value;
    const pwd = document.getElementById('esPassword').value;
    const name = document.getElementById('esName').value;
    if (!email || !pwd) { alert('Email & password required'); return; }
    if (mode === 'login') {
      try {
        const r = await fetch((window.API_BASE||'/api') + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password: pwd }) }).then(r=>r.json());
        if (r.token) { localStorage.setItem('eco_token', r.token); document.getElementById('esAuthBackdrop').style.display='none'; window.dispatchEvent(new Event('eco:auth:changed')); return; }
        alert('Login failed: ' + (r.error || JSON.stringify(r)));
      } catch(e){ alert('Login error'); console.error(e); }
    } else {
      try {
        const role = prompt('Role (donor/rescuer):') || 'rescuer';
        const r = await fetch((window.API_BASE||'/api') + '/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password: pwd, role }) }).then(r=>r.json());
        if (r.token) { localStorage.setItem('eco_token', r.token); document.getElementById('esAuthBackdrop').style.display='none'; window.dispatchEvent(new Event('eco:auth:changed')); return; }
        alert('Register failed: ' + (r.error || JSON.stringify(r)));
      } catch(e){ alert('Register error'); console.error(e); }
    }
  }

  document.getElementById('esSubmit').addEventListener('click', submitAuth);

  // Expose API
  window.EcoAuthUI = {
    showLogin: ()=> showAuthModal('login'),
    showRegister: ()=> showAuthModal('register'),
    logout: ()=> { localStorage.removeItem('eco_token'); window.dispatchEvent(new Event('eco:auth:changed')); }
  };

  // auto close on Escape
  window.addEventListener('keydown', (e)=> { if(e.key === 'Escape') { const b = document.getElementById('esAuthBackdrop'); if(b) b.style.display='none'; } });

})();
