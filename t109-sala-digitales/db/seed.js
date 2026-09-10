const bcrypt = require('bcryptjs');
const db = require('./init');

// Roster proporcionado por el usuario.
// username / password_temporal se generan de forma predecible;
// cada quien debera cambiar su contraseña en el primer login.
const roster = [
  { full_name: 'Andres González',    area: 'Impresión 3D',        username: 'andres.gonzalez' },
  { full_name: 'Ismael Beltrán',     area: 'Electrónica General', username: 'ismael.beltran' },
  { full_name: 'Xanthe Figueroa',    area: 'Electrónica General', username: 'xanthe.figueroa' },
  { full_name: 'Sonia Anel Gomez',   area: 'Electrónica General', username: 'sonia.anel' },
  { full_name: 'Hannia Martinez',    area: 'Electrónica General', username: 'hannia.martinez' },
  { full_name: 'Oscar Lagunes',      area: 'Mantenimiento General', username: 'oscar.lagunes' },
  { full_name: 'Gonzalo Campos',     area: 'Mantenimiento General', username: 'gonzalo.campos' },
  { full_name: 'Kenneth Gonzalez',   area: 'Mantenimiento General', username: 'kenneth.gonzalez' },
  { full_name: 'Ricardo del Angel',  area: 'Mantenimiento General', username: 'ricardo.delangel' },
  { full_name: 'Emiliano Rendon',    area: 'Mantenimiento General', username: 'emiliano.rendon' },
  { full_name: 'Alejandro Gallegos', area: 'Manuales y Software',  username: 'alejandro.gallegos' },
  { full_name: 'Kenya Garcia Garcia', area: 'Inventario',          username: 'kenya.garcia' },
  { full_name: 'Fernando',           area: 'Administración',       username: 'fernando', role: 'admin' },
  { full_name: 'Dr. Ricardo',        area: 'Administración',       username: 'dr.ricardo', role: 'admin' },
];

function tempPassword(username) {
  // Contraseña temporal simple y predecible: usuario123
  return `${username.split('.')[0]}123`;
}

const insert = db.prepare(`
  INSERT INTO users (username, password_hash, full_name, area, role, must_change_password)
  VALUES (@username, @password_hash, @full_name, @area, @role, 1)
  ON CONFLICT(username) DO NOTHING
`);

const credentials = [];

const tx = db.transaction((rows) => {
  for (const r of rows) {
    const role = r.role || 'member';
    const pass = tempPassword(r.username);
    const password_hash = bcrypt.hashSync(pass, 10);
    insert.run({
      username: r.username,
      password_hash,
      full_name: r.full_name,
      area: r.area,
      role,
    });
    credentials.push({ username: r.username, pass, full_name: r.full_name, role });
  }
});

tx(roster);

console.log('Usuarios creados (o ya existentes). Credenciales temporales:\n');
console.table(credentials);
console.log('\nCada usuario debe cambiar su contraseña la primera vez que entra.');
