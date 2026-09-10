# Sala de Digitales T109 — Bitácora semanal de servicio social

Aplicación web para que los integrantes de servicio social suban su actividad
de la semana (título, descripción, foto y anexos), y para que Fernando y el
Dr. Ricardo, como administradores, vean todo en un calendario semanal.

## Qué incluye

- **Login por usuario y contraseña** para cada integrante (ver tabla abajo).
- **Formulario de actividad**: título, descripción, fecha, foto (imagen) y
  hasta 5 anexos (PDF, Word, Excel, ZIP, etc.).
- **"Mis actividades"**: cada integrante ve su propio historial.
- **Panel de administrador**: calendario semana por semana (lunes a domingo),
  con filtro por área y por integrante, y detalle de cada actividad al hacer clic.
- **Base de datos**: SQLite (un solo archivo, `data/sala_digitales.db`). No
  necesitas instalar MySQL/Postgres ni contratar un servidor de base de datos
  aparte — es la opción "tranqui" que soporta bien las rutas de fotos y anexos.
  Las imágenes y archivos no se guardan dentro de la base de datos, se guardan
  como archivos en `uploads/` y la base de datos solo guarda la ruta (es lo
  normal y lo más eficiente).

## Cómo correrlo (en tu computadora o en un servidor)

Necesitas tener [Node.js](https://nodejs.org) instalado (versión 18 o más reciente).

```bash
cd t109-sala-digitales
npm install        # instala las dependencias, una sola vez
npm run seed       # crea la base de datos y los usuarios (una sola vez)
npm start          # levanta el servidor
```

Abre tu navegador en **http://localhost:3000**.

Si vuelves a correr `npm run seed`, no duplica usuarios que ya existan.

## Usuarios y contraseñas temporales

Todos deben cambiar su contraseña la primera vez que entran, con el botón
**"Cambiar contraseña"** que aparece arriba a la derecha ya estando dentro.

| Área | Nombre | Usuario | Contraseña temporal |
|---|---|---|---|
| Impresión 3D | Andres González | `andres.gonzalez` | `andres123` |
| Electrónica General | Ismael Beltrán | `ismael.beltran` | `ismael123` |
| Electrónica General | Xanthe Figueroa | `xanthe.figueroa` | `xanthe123` |
| Electrónica General | Sonia Anel Gomez | `sonia.anel` | `sonia123` |
| Electrónica General | Hannia Martinez | `hannia.martinez` | `hannia123` |
| Mantenimiento General | Oscar Lagunes | `oscar.lagunes` | `oscar123` |
| Mantenimiento General | Gonzalo Campos | `gonzalo.campos` | `gonzalo123` |
| Mantenimiento General | Kenneth Gonzalez | `kenneth.gonzalez` | `kenneth123` |
| Mantenimiento General | Ricardo del Angel | `ricardo.delangel` | `ricardo123` |
| Mantenimiento General | Emiliano Rendon | `emiliano.rendon` | `emiliano123` |
| Manuales y Software | Alejandro Gallegos | `alejandro.gallegos` | `alejandro123` |
| Inventario | Kenya Garcia Garcia | `kenya.garcia` | `kenya123` |
| **Administrador** | Fernando | `fernando` | `fernando123` |
| **Administrador** | Dr. Ricardo | `dr.ricardo` | `dr123` |

> Si algún otro nombre o usuario no queda como esperabas, dímelo y ajusto el
> `db/seed.js` — es solo esa lista la que hay que editar.

## Estructura del proyecto

```
t109-sala-digitales/
├── server.js            # servidor Express: login, sesiones, subida de archivos, API
├── db/
│   ├── init.js           # crea las tablas de SQLite
│   └── seed.js           # crea los usuarios iniciales (edítalo si cambia el roster)
├── data/sala_digitales.db  # la base de datos (se crea sola)
├── uploads/               # fotos y anexos subidos
└── public/                # todo el frontend (HTML, CSS, JS)
    ├── index.html          # login
    ├── dashboard.html      # vista de integrante
    ├── admin.html          # vista de administrador (calendario)
    └── js/, css/
```

## Cómo agregar, quitar o corregir integrantes

Edita el arreglo `roster` en `db/seed.js` (nombre, área, usuario) y vuelve a
correr `npm run seed`. Los usuarios que ya existan no se tocan; solo se
agregan los nuevos.

## Ponerlo en línea (para que no dependa de tu computadora encendida)

Este proyecto es un servidor Node normal, así que corre en cualquier
proveedor que soporte Node.js + almacenamiento persistente, por ejemplo:

- **Render.com** o **Railway.app**: conectas tu repositorio de GitHub, eligen
  "Node" como entorno, comando de inicio `npm start`, y agregas un "disco
  persistente" (persistent disk) montado en `/data` y otro en `/uploads` para
  que la base de datos y las fotos no se borren en cada despliegue.
- Un **VPS** (DigitalOcean, un servidor de la escuela, etc.) corriendo
  `npm start` detrás de `pm2` o como servicio de systemd, con Nginx como proxy
  si quieres HTTPS con dominio propio.

Antes de ponerlo en línea de verdad, cambia estas dos cosas en `server.js`:

1. La línea `secret: process.env.SESSION_SECRET || '...'` — pon una variable
   de entorno `SESSION_SECRET` con un valor largo y aleatorio.
2. Activa cookies seguras (`cookie: { secure: true }`) si vas a usar HTTPS.

## Seguridad y respaldo (importante)

- Haz un respaldo periódico del archivo `data/sala_digitales.db` y de la
  carpeta `uploads/` — ahí vive toda la información. Con copiarlos a otro
  lado (o subirlos a Drive) es suficiente respaldo, no necesitas nada especial.
- Las contraseñas se guardan cifradas (bcrypt), nunca en texto plano.
- Cada quien solo ve y sube sus propias actividades; solo Fernando y el
  Dr. Ricardo (rol "admin") ven las de todos.
