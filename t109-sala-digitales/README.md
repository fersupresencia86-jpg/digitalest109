# Sala de Digitales T109 — Bitácora semanal de servicio social

Aplicación web para que los integrantes de servicio social suban su actividad
de la semana (título, descripción, foto y anexos), y para que Fernando y el
Dr. Ricardo, como administradores, vean todo en un calendario semanal.

## Cómo guarda la información (100% gratis)

- **Base de datos**: [Turso](https://turso.tech) — una base de datos en la
  nube compatible con SQLite, con un plan gratis de sobra para este proyecto.
- **Fotos y anexos**: se guardan *dentro* de la misma base de datos (no en
  disco), así que no necesitas ningún servicio aparte para archivos, y no se
  pierden aunque el servidor se reinicie o se "duerma" por inactividad.
- Esto permite correr el servidor en el **plan gratuito de Render**, sin
  tarjeta de crédito y sin pagar nada.

En tu computadora, si no configuras Turso, la app usa automáticamente un
archivo local (`data/sala_digitales.db`) para que puedas probar sin internet.

## Cómo correrlo en tu computadora (para probar)

Necesitas [Node.js](https://nodejs.org) 18 o más reciente.

```bash
cd t109-sala-digitales
npm install
npm run seed     # crea la base de datos local y los usuarios
npm start
```

Abre **http://localhost:3000**.

## Cómo ponerlo en línea gratis (Turso + Render)

### 1. Crear la base de datos gratis en Turso

1. Entra a [turso.tech](https://turso.tech) y crea una cuenta gratis (puedes
   entrar con tu cuenta de GitHub).
2. Instala su herramienta de línea de comandos siguiendo las instrucciones de
   su página, o usa el botón **"Create Database"** desde su panel web si lo
   ofrecen para tu cuenta.
3. Crea una base de datos, por ejemplo con el nombre `sala-digitales-t109`.
4. En el panel de esa base de datos busca:
   - **Database URL** (empieza con `libsql://...`)
   - Un botón para crear un **Auth Token** (token de autenticación)
5. Guarda esos dos valores, los vas a necesitar en Render.

### 2. Configurar el servicio en Render

Igual que antes, pero con estas variables de entorno en vez de las de disco:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | cualquier texto largo inventado |
| `TURSO_DATABASE_URL` | la URL que copiaste de Turso (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | el token que copiaste de Turso |

- **Root Directory**: `t109-sala-digitales` (si tu repo tiene esa carpeta anidada)
- **Build Command**: `npm install && npm run seed`
- **Start Command**: `npm start`
- **Plan**: puedes dejar **Free** — ya no se necesita disco persistente,
  todo vive en Turso.

Da clic en **Deploy** y espera a que termine de construir. Te da una URL
pública para compartir con todo el equipo.

> Nota sobre el plan gratis de Render: el servicio "se duerme" tras ~15
> minutos sin visitas, y tarda unos segundos en despertar la próxima vez que
> alguien entra. Es normal y no afecta a los datos guardados — solo la
> primera carga de la página puede tardar un poco más.

## Usuarios y contraseñas temporales

Todos deben cambiar su contraseña la primera vez que entran, con el botón
**"Cambiar contraseña"** arriba a la derecha ya estando dentro.

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

## Estructura del proyecto

```
t109-sala-digitales/
├── server.js            # servidor Express: login, sesiones, API, servir fotos/anexos
├── db/
│   ├── init.js           # conexión a la base de datos (Turso o archivo local) y esquema
│   └── seed.js           # crea los usuarios iniciales (edítalo si cambia el roster)
├── data/                  # solo se usa en modo local (tu computadora); no existe en Turso
└── public/                # todo el frontend (HTML, CSS, JS)
    ├── index.html          # login
    ├── dashboard.html      # vista de integrante
    ├── admin.html          # vista de administrador (calendario)
    └── js/, css/
```

## Cómo agregar, quitar o corregir integrantes

Edita el arreglo `roster` en `db/seed.js` y vuelve a correr `npm run seed`
(en Render, esto pasa solo en cada despliegue porque está en el Build
Command). Los usuarios que ya existan no se tocan.

## Límites del plan gratis a tener en cuenta

- Cada foto o anexo se limita a 5 MB para cuidar la cuota gratis de Turso
  (varios cientos de MB de almacenamiento total, de sobra para un grupo
  chico subiendo actividades semanales).
- Si en el futuro crecen mucho las fotos, se puede subir el límite o mover
  los archivos a un servicio de almacenamiento aparte — avísame si llegan a
  ese punto y lo ajustamos.

## Seguridad y respaldo

- Las contraseñas se guardan cifradas (bcrypt), nunca en texto plano.
- Cada quien solo ve y sube sus propias actividades; solo Fernando y el
  Dr. Ricardo (rol "admin") ven las de todos.
- Turso guarda copias de tu base de datos automáticamente, pero si quieres
  un respaldo extra, su propia herramienta de línea de comandos permite
  exportar la base de datos completa a un archivo cuando quieras.
