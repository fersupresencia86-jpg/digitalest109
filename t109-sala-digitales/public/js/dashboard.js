let CURRENT_USER = null;

(async function init() {
  CURRENT_USER = await requireSessionOrRedirect('member');
  if (!CURRENT_USER) return;
  document.getElementById('whoPill').textContent = CURRENT_USER.full_name;
  document.getElementById('areaTag').textContent = CURRENT_USER.area;
  document.getElementById('areaTag').style.borderLeftColor = areaColor(CURRENT_USER.area);
  document.getElementById('activity_date').value = new Date().toISOString().slice(0, 10);

  wireLogout();
  wireChangePassword();
  wireTabs();
  wireForm();
})();

function wireTabs() {
  const tabs = document.querySelectorAll('.nav-item');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-nueva').style.display = btn.dataset.tab === 'nueva' ? 'block' : 'none';
      document.getElementById('tab-mias').style.display = btn.dataset.tab === 'mias' ? 'block' : 'none';
      if (btn.dataset.tab === 'mias') loadMine();
    });
  });
}

function wireForm() {
  const form = document.getElementById('activityForm');
  const errBox = document.getElementById('formErr');
  const okBox = document.getElementById('formOk');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.remove('show');
    okBox.classList.remove('show');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando…';

    try {
      const fd = new FormData(form);
      const res = await fetch('/api/activities', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      okBox.classList.add('show');
      form.reset();
      document.getElementById('activity_date').value = new Date().toISOString().slice(0, 10);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.add('show');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar actividad';
    }
  });
}

async function loadMine() {
  const container = document.getElementById('misActividades');
  container.innerHTML = '<p class="hint">Cargando…</p>';
  const res = await fetch('/api/activities/mine');
  const rows = await res.json();
  if (!rows.length) {
    container.innerHTML = '<div class="empty-state">Aún no has registrado actividades.</div>';
    return;
  }
  container.innerHTML = rows.map(renderActivity).join('');
}

function renderActivity(a) {
  const thumb = a.photo_path
    ? `<img class="thumb" src="${a.photo_path}" alt="">`
    : `<div class="thumb empty">SIN FOTO</div>`;
  const attachments = (a.attachments || []).map(f =>
    `<a href="${f.file_path}" target="_blank" rel="noopener">${escapeHtml(f.original_name)}</a>`
  ).join('');
  return `
    <div class="activity">
      ${thumb}
      <div class="body">
        <div class="meta"><span>${fmtDate(a.activity_date)}</span></div>
        <h3>${escapeHtml(a.title)}</h3>
        <p>${escapeHtml(a.description)}</p>
        ${attachments ? `<div class="attachments">${attachments}</div>` : ''}
      </div>
    </div>`;
}
