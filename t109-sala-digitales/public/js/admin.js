let CURRENT_USER = null;
let weekStart = mondayOf(new Date());

(async function init() {
  CURRENT_USER = await requireSessionOrRedirect('admin');
  if (!CURRENT_USER) return;
  document.getElementById('whoPill').textContent = CURRENT_USER.full_name;

  wireLogout();
  wireChangePassword();
  await loadFilterOptions();
  wireWeekNav();
  wireFilters();
  wireModal();
  renderWeek();
})();

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function isoDate(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

async function loadFilterOptions() {
  const [areas, users] = await Promise.all([
    fetch('/api/areas').then(r => r.json()),
    fetch('/api/users').then(r => r.json()),
  ]);
  const areaSel = document.getElementById('filterArea');
  areas.forEach(a => areaSel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`));

  window.ALL_USERS = users;
  const userSel = document.getElementById('filterUser');
  users.forEach(u => userSel.insertAdjacentHTML('beforeend', `<option value="${u.id}">${escapeHtml(u.full_name)}</option>`));
}

function wireWeekNav() {
  document.getElementById('prevWeek').addEventListener('click', () => { weekStart = addDays(weekStart, -7); renderWeek(); });
  document.getElementById('nextWeek').addEventListener('click', () => { weekStart = addDays(weekStart, 7); renderWeek(); });
  document.getElementById('todayWeek').addEventListener('click', () => { weekStart = mondayOf(new Date()); renderWeek(); });
}

function wireFilters() {
  document.getElementById('filterArea').addEventListener('change', (e) => {
    filterUsersByArea(e.target.value);
    renderWeek();
  });
  document.getElementById('filterUser').addEventListener('change', renderWeek);
}

function filterUsersByArea(area) {
  const userSel = document.getElementById('filterUser');
  const current = userSel.value;
  userSel.innerHTML = '<option value="">Todos</option>';
  (window.ALL_USERS || [])
    .filter(u => !area || u.area === area)
    .forEach(u => userSel.insertAdjacentHTML('beforeend', `<option value="${u.id}">${escapeHtml(u.full_name)}</option>`));
  if ([...userSel.options].some(o => o.value === current)) userSel.value = current;
}

async function renderWeek() {
  const ws = isoDate(weekStart);
  const we = addDays(weekStart, 6);
  document.getElementById('weekLabel').textContent =
    `${weekStart.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} — ${we.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const params = new URLSearchParams({ week_start: ws });
  const area = document.getElementById('filterArea').value;
  const userId = document.getElementById('filterUser').value;
  if (area) params.set('area', area);
  if (userId) params.set('user_id', userId);

  const rows = await fetch(`/api/activities?${params.toString()}`).then(r => r.json());

  const byDate = {};
  for (const r of rows) (byDate[r.activity_date] ||= []).push(r);

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const iso = isoDate(d);
    const items = byDate[iso] || [];
    const col = document.createElement('div');
    col.className = 'day-col';
    col.innerHTML = `
      <div class="day-head">${dayNames[i]} <span class="num">${d.getDate()}</span></div>
      ${items.length ? items.map(chip).join('') : '<p class="hint" style="margin:0;">Sin actividad</p>'}
    `;
    cal.appendChild(col);
  }
  attachChipHandlers(rows);
}

function chip(a) {
  return `
    <div class="chip" style="border-left-color:${areaColor(a.area)}" data-id="${a.id}">
      <div class="who">${escapeHtml(a.full_name)} · ${escapeHtml(a.area)}</div>
      <div class="title">${escapeHtml(a.title)}</div>
    </div>`;
}

function attachChipHandlers(rows) {
  document.querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', () => {
      const row = rows.find(r => String(r.id) === el.dataset.id);
      if (row) openDetail(row);
    });
  });
}

function wireModal() {
  document.getElementById('detailBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'detailBackdrop') e.target.classList.remove('show');
  });
}

function openDetail(a) {
  const modal = document.getElementById('detailModal');
  const thumb = a.photo_path ? `<img src="${a.photo_path}" style="width:100%;border-radius:8px;margin-bottom:14px;">` : '';
  const attachments = (a.attachments || []).map(f =>
    `<a href="${f.file_path}" target="_blank" rel="noopener">${escapeHtml(f.original_name)}</a>`
  ).join('');
  modal.innerHTML = `
    <button class="close" onclick="document.getElementById('detailBackdrop').classList.remove('show')">✕</button>
    <div class="tag" style="background:${areaColor(a.area)}">${escapeHtml(a.area)}</div>
    <h2 style="margin-top:10px;">${escapeHtml(a.title)}</h2>
    <p class="hint" style="margin-bottom:14px;">${escapeHtml(a.full_name)} · ${fmtDate(a.activity_date)}</p>
    ${thumb}
    <p>${escapeHtml(a.description)}</p>
    ${attachments ? `<div class="attachments" style="margin-top:12px;">${attachments}</div>` : ''}
  `;
  document.getElementById('detailBackdrop').classList.add('show');
}
