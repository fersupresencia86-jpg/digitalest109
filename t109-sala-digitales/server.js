const path = require('path');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db, ensureSchema } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (IS_PROD) app.set('trust proxy', 1); // necesario en Render/Railway para cookies "secure"

app.use(session({
  secret: process.env.SESSION_SECRET || 'sala-digitales-t109-cambia-esto',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8 horas
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
  },
}));

app.use(express.static(path.join(__dirname, 'public')));

// ---------- Multer: todo se guarda en memoria, no en disco ----------
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
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5 MB por archivo: cuida la cuota gratis de Turso
  fileFilter: (req, file, cb) => cb(null, ALLOWED_MIME.has(file.mimetype)),
});

// ---------- Helpers ----------
function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
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
  return {
    id: u.id, username: u.username, full_name: u.full_name, area: u.area,
    role: u.role, must_change_password: !!u.must_change_password,
  };
}
function row1(result) { return result.rows[0] || null; }

// ---------- Auth ----------
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ?',
    args: [(username || '').trim().toLowerCase()],
  });
  const user = row1(result);
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

app.post('/api/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  }
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.session.user.id] });
  const user = row1(result);
  if (!bcrypt.compareSync(current_password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  await db.execute({ sql: 'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', args: [hash, user.id] });
  req.session.user.must_change_password = false;
  res.json({ ok: true });
});

// ---------- Actividades ----------
app.post('/api/activities', requireAuth, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'attachments', maxCount: 5 },
]), async (req, res) => {
  try {
    const { title, description, activity_date } = req.body;
    if (!title || !description || !activity_date) {
      return res.status(400).json({ error: 'Faltan campos: título, descripción o fecha' });
    }
    const week_start = mondayOf(activity_date);
    const photo = req.files?.photo?.[0];

    const insertResult = await db.execute({
      sql: `INSERT INTO activities (user_id, title, description, activity_date, week_start, photo_blob, photo_mime)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        req.session.user.id, title.trim(), description.trim(), activity_date, week_start,
        photo ? photo.buffer : null,
        photo ? photo.mimetype : null,
      ],
    });
    const activityId = Number(insertResult.lastInsertRowid);

    for (const f of req.files?.attachments || []) {
      await db.execute({
        sql: 'INSERT INTO attachments (activity_id, file_blob, mime_type, original_name) VALUES (?, ?, ?, ?)',
        args: [activityId, f.buffer, f.mimetype, f.originalname],
      });
    }

    res.status(201).json({ ok: true, id: activityId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar la actividad' });
  }
});

app.get('/api/activities/mine', requireAuth, async (req, res) => {
  const result = await db.execute({
    sql: `SELECT id, user_id, title, description, activity_date, week_start,
                 (photo_blob IS NOT NULL) AS has_photo, created_at
          FROM activities WHERE user_id = ? ORDER BY activity_date DESC, id DESC`,
    args: [req.session.user.id],
  });
  const rows = result.rows;
  await attachAttachmentMeta(rows);
  res.json(rows);
});

app.get('/api/activities', requireAdmin, async (req, res) => {
  const { week_start, user_id, area } = req.query;
  let sql = `SELECT a.id, a.user_id, a.title, a.description, a.activity_date, a.week_start,
                    (a.photo_blob IS NOT NULL) AS has_photo, a.created_at,
                    u.full_name, u.area, u.username
             FROM activities a JOIN users u ON u.id = a.user_id WHERE 1=1`;
  const args = [];
  if (week_start) { sql += ' AND a.week_start = ?'; args.push(week_start); }
  if (user_id) { sql += ' AND a.user_id = ?'; args.push(user_id); }
  if (area) { sql += ' AND u.area = ?'; args.push(area); }
  sql += ' ORDER BY a.activity_date DESC, a.id DESC';
  const result = await db.execute({ sql, args });
  const rows = result.rows;
  await attachAttachmentMeta(rows);
  res.json(rows);
});

async function attachAttachmentMeta(rows) {
  for (const r of rows) {
    const result = await db.execute({
      sql: 'SELECT id, original_name FROM attachments WHERE activity_id = ?',
      args: [r.id],
    });
    r.attachments = result.rows;
  }
}

// Sirve la foto de una actividad directo desde la base de datos
app.get('/files/photo/:activityId', requireAuth, async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT photo_blob, photo_mime FROM activities WHERE id = ?',
    args: [req.params.activityId],
  });
  const row = row1(result);
  if (!row || !row.photo_blob) return res.status(404).end();
  res.set('Content-Type', row.photo_mime || 'application/octet-stream');
  res.set('Cache-Control', 'private, max-age=3600');
  res.send(Buffer.from(row.photo_blob));
});

// Sirve un anexo directo desde la base de datos
app.get('/files/attachment/:attachmentId', requireAuth, async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT file_blob, mime_type, original_name FROM attachments WHERE id = ?',
    args: [req.params.attachmentId],
  });
  const row = row1(result);
  if (!row) return res.status(404).end();
  res.set('Content-Type', row.mime_type || 'application/octet-stream');
  res.set('Content-Disposition', `inline; filename="${row.original_name.replace(/[^\w.\-]/g, '_')}"`);
  res.send(Buffer.from(row.file_blob));
});

app.get('/api/users', requireAdmin, async (req, res) => {
  const result = await db.execute("SELECT id, username, full_name, area, role FROM users WHERE role = 'member' ORDER BY area, full_name");
  res.json(result.rows);
});

app.get('/api/areas', requireAuth, async (req, res) => {
  const result = await db.execute("SELECT DISTINCT area FROM users WHERE role = 'member' ORDER BY area");
  res.json(result.rows.map(r => r.area));
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Sala de Digitales T109 escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo preparar la base de datos:', err);
    process.exit(1);
  });
