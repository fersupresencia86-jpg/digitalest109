const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'sala-digitales-t109-cambia-esto',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8 horas
    httpOnly: true,
  },
}));

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Multer (subida de archivos) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
  },
});
const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'text/plain',
]);
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_MIME.has(file.mimetype));
  },
});

// ---------- Helpers ----------
function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=domingo
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
}
function publicUser(u) {
  return { id: u.id, username: u.username, full_name: u.full_name, area: u.area, role: u.role, must_change_password: !!u.must_change_password };
}

// ---------- Auth ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get((username || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  req.session.user = publicUser(user);
  res.json({ user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post('/api/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  if (!bcrypt.compareSync(current_password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, user.id);
  req.session.user.must_change_password = false;
  res.json({ ok: true });
});

// ---------- Actividades ----------
app.post('/api/activities', requireAuth, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'attachments', maxCount: 5 },
]), (req, res) => {
  const { title, description, activity_date } = req.body;
  if (!title || !description || !activity_date) {
    return res.status(400).json({ error: 'Faltan campos: título, descripción o fecha' });
  }
  const week_start = mondayOf(activity_date);
  const photo = req.files?.photo?.[0];
  const photo_path = photo ? `/uploads/${photo.filename}` : null;

  const info = db.prepare(`
    INSERT INTO activities (user_id, title, description, activity_date, week_start, photo_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.session.user.id, title.trim(), description.trim(), activity_date, week_start, photo_path);

  const attachInsert = db.prepare('INSERT INTO attachments (activity_id, file_path, original_name) VALUES (?, ?, ?)');
  for (const f of req.files?.attachments || []) {
    attachInsert.run(info.lastInsertRowid, `/uploads/${f.filename}`, f.originalname);
  }

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

app.get('/api/activities/mine', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY activity_date DESC, id DESC').all(req.session.user.id);
  attachAttachments(rows);
  res.json(rows);
});

app.get('/api/activities', requireAdmin, (req, res) => {
  const { week_start, user_id, area } = req.query;
  let sql = `SELECT a.*, u.full_name, u.area, u.username FROM activities a JOIN users u ON u.id = a.user_id WHERE 1=1`;
  const params = [];
  if (week_start) { sql += ' AND a.week_start = ?'; params.push(week_start); }
  if (user_id) { sql += ' AND a.user_id = ?'; params.push(user_id); }
  if (area) { sql += ' AND u.area = ?'; params.push(area); }
  sql += ' ORDER BY a.activity_date DESC, a.id DESC';
  const rows = db.prepare(sql).all(...params);
  attachAttachments(rows);
  res.json(rows);
});

function attachAttachments(rows) {
  const stmt = db.prepare('SELECT file_path, original_name FROM attachments WHERE activity_id = ?');
  for (const r of rows) r.attachments = stmt.all(r.id);
}

app.get('/api/users', requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT id, username, full_name, area, role FROM users WHERE role = 'member' ORDER BY area, full_name").all();
  res.json(rows);
});

app.get('/api/areas', requireAuth, (req, res) => {
  const rows = db.prepare("SELECT DISTINCT area FROM users WHERE role = 'member' ORDER BY area").all();
  res.json(rows.map(r => r.area));
});

app.listen(PORT, () => {
  console.log(`Sala de Digitales T109 escuchando en http://localhost:${PORT}`);
});
