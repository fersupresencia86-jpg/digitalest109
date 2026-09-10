const AREA_COLORS = {
  'Impresión 3D':        'var(--area-impresion)',
  'Electrónica General': 'var(--area-electronica)',
  'Mantenimiento General': 'var(--area-mantenimiento)',
  'Manuales y Software': 'var(--area-manuales)',
  'Inventario':          'var(--area-inventario)',
  'Administración':      'var(--area-admin)',
};

function areaColor(area) {
  return AREA_COLORS[area] || 'var(--accent)';
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
}

async function requireSessionOrRedirect(roleNeeded) {
  const res = await fetch('/api/session');
  const { user } = await res.json();
  if (!user) { window.location.href = '/index.html'; return null; }
  if (roleNeeded && user.role !== roleNeeded) {
    window.location.href = user.role === 'admin' ? '/admin.html' : '/dashboard.html';
    return null;
  }
  return user;
}

function wireLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });
}

function wireChangePassword() {
  const backdrop = document.getElementById('pwBackdrop');
  const openBtn = document.getElementById('changePassBtn');
  const closeBtn = document.getElementById('pwClose');
  const form = document.getElementById('pwForm');
  const err = document.getElementById('pwErr');
  const ok = document.getElementById('pwOk');
  if (!backdrop || !form) return;

  openBtn.addEventListener('click', () => { backdrop.classList.add('show'); err.classList.remove('show'); ok.classList.remove('show'); });
  closeBtn.addEventListener('click', () => backdrop.classList.remove('show'));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.classList.remove('show'); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.remove('show'); ok.classList.remove('show');
    const current_password = document.getElementById('current_password').value;
    const new_password = document.getElementById('new_password').value;
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'No se pudo actualizar'; err.classList.add('show'); return; }
    ok.classList.add('show');
    form.reset();
  });
}
