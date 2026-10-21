// =====================================================
// Servidor web Node.js + Express conectado a MySQL
// Corre dentro de un contenedor Docker
// =====================================================
const express = require('express');
const mysql = require('mysql2/promise');
const os = require('os');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Datos de conexión (vienen de docker-compose.yml)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'tienda',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
};

let pool;

// Reintenta la conexión hasta que MySQL esté listo
async function conectar(intentos = 20) {
  for (let i = 1; i <= intentos; i++) {
    try {
      pool = mysql.createPool(dbConfig);
      await pool.query('SELECT 1');
      console.log('✅ Conectado a MySQL en el host "' + dbConfig.host + '"');
      return;
    } catch (e) {
      console.log(`⏳ Esperando MySQL (intento ${i}/${intentos})...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('No se pudo conectar a MySQL');
}

// Evita inyección de HTML al mostrar datos
const esc = v => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dinero = v => '$' + Number(v).toLocaleString('es-CO', { minimumFractionDigits: 2 });

// Plantilla común de todas las páginas
function pagina(titulo, activo, contenido) {
  const link = (href, txt) =>
    `<li class="nav-item"><a class="nav-link ${activo === href ? 'active fw-semibold' : ''}" href="${href}">${txt}</a></li>`;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo} · Tienda Docker</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <style>
    body { background:#f4f7fb; }
    .navbar { background: linear-gradient(90deg,#0b3d91,#1d63ed); }
    .card { border:0; border-radius:14px; box-shadow:0 4px 18px rgba(16,40,90,.08); }
    .hero { background: linear-gradient(135deg,#1d63ed,#0db7ed); color:#fff; border-radius:18px; }
    .stat { font-size:2rem; font-weight:700; }
    .table thead th { background:#eef3ff; color:#0b3d91; font-weight:600; }
    .badge-docker { background:#0db7ed; }
    footer { color:#7a8699; }
  </style>
</head>
<body>
  <nav class="navbar navbar-expand-md navbar-dark mb-4">
    <div class="container">
      <a class="navbar-brand fw-bold" href="/"><i class="bi bi-box-seam"></i> Tienda Docker</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="menu">
        <ul class="navbar-nav ms-auto">
          ${link('/', '<i class="bi bi-house"></i> Inicio')}
          ${link('/registrar', '<i class="bi bi-pencil-square"></i> Registrar')}
          ${link('/datos', '<i class="bi bi-database"></i> Ver datos')}
        </ul>
      </div>
    </div>
  </nav>
  <main class="container pb-5">${contenido}</main>
  <footer class="text-center small pb-4">
    Servido desde el contenedor <code>${esc(os.hostname())}</code> · Node ${process.version}
  </footer>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
}

function alerta(req) {
  if (req.query.ok) return `<div class="alert alert-success"><i class="bi bi-check-circle"></i> ${esc(req.query.ok)}</div>`;
  if (req.query.error) return `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> ${esc(req.query.error)}</div>`;
  return '';
}

// ---------- INICIO: muestra que la app corre en Docker ----------
app.get('/', async (req, res) => {
  const [[c]] = await pool.query('SELECT COUNT(*) total FROM clientes');
  const [[p]] = await pool.query('SELECT COUNT(*) total FROM pedidos');
  const [[v]] = await pool.query('SELECT VERSION() version');
  res.send(pagina('Inicio', '/', `
    <div class="hero p-4 p-md-5 mb-4">
      <h1 class="fw-bold"><i class="bi bi-boxes"></i> Aplicación en contenedores Docker</h1>
      <p class="lead mb-0">Servidor web Node.js + base de datos MySQL, cada uno en su propio contenedor.</p>
    </div>
    <div class="row g-4 mb-4">
      <div class="col-md-6"><div class="card p-4 h-100">
        <h5><i class="bi bi-hdd-network text-primary"></i> Contenedor del servidor web</h5>
        <ul class="list-unstyled mb-0 mt-2">
          <li><b>ID del contenedor (hostname):</b> <code>${esc(os.hostname())}</code></li>
          <li><b>Imagen:</b> <span class="badge badge-docker">tienda-web:1.0</span> (base node:20-alpine)</li>
          <li><b>Node.js:</b> ${process.version}</li>
          <li><b>Sistema:</b> ${esc(os.type())} ${esc(os.release())}</li>
          <li><b>Puerto interno:</b> 3000</li>
        </ul>
      </div></div>
      <div class="col-md-6"><div class="card p-4 h-100">
        <h5><i class="bi bi-database text-primary"></i> Contenedor de la base de datos</h5>
        <ul class="list-unstyled mb-0 mt-2">
          <li><b>Host en la red Docker:</b> <code>${esc(dbConfig.host)}</code></li>
          <li><b>Imagen:</b> <span class="badge badge-docker">tienda-mysql:1.0</span> (base mysql:8.0)</li>
          <li><b>Versión MySQL:</b> ${esc(v.version)}</li>
          <li><b>Base de datos:</b> ${esc(dbConfig.database)}</li>
          <li><b>Persistencia:</b> volumen <code>datos_mysql</code></li>
        </ul>
      </div></div>
    </div>
    <div class="row g-4">
      <div class="col-6"><div class="card p-4 text-center">
        <div class="stat text-primary">${c.total}</div><div>Clientes registrados</div></div></div>
      <div class="col-6"><div class="card p-4 text-center">
        <div class="stat text-primary">${p.total}</div><div>Pedidos registrados</div></div></div>
    </div>`));
});

// ---------- REGISTRAR: formularios ----------
app.get('/registrar', async (req, res) => {
  const [clientes] = await pool.query('SELECT id, nombre FROM clientes ORDER BY nombre');
  const opciones = clientes.map(c => `<option value="${c.id}">${esc(c.nombre)} (ID ${c.id})</option>`).join('');
  res.send(pagina('Registrar', '/registrar', `
    <h2 class="fw-bold mb-3">Registrar información</h2>
    ${alerta(req)}
    <div class="row g-4">
      <div class="col-lg-6"><div class="card p-4">
        <h5 class="mb-3"><i class="bi bi-person-plus text-primary"></i> Nuevo cliente</h5>
        <form method="post" action="/clientes">
          <div class="mb-3"><label class="form-label">Nombre completo</label>
            <input name="nombre" class="form-control" required maxlength="100" placeholder="Ej. Laura Gómez"></div>
          <div class="mb-3"><label class="form-label">Correo electrónico</label>
            <input name="email" type="email" class="form-control" required maxlength="100" placeholder="laura@correo.com"></div>
          <div class="row">
            <div class="col-sm-6 mb-3"><label class="form-label">Fecha de nacimiento</label>
              <input name="fecha_nacimiento" type="date" class="form-control" required></div>
            <div class="col-sm-6 mb-3"><label class="form-label">Género</label>
              <select name="genero" class="form-select" required>
                <option value="F">Femenino</option><option value="M">Masculino</option><option value="O">Otro</option>
              </select></div>
          </div>
          <div class="mb-3"><label class="form-label">Saldo inicial</label>
            <input name="saldo" type="number" step="0.01" min="0" class="form-control" value="0"></div>
          <div class="form-check form-switch mb-3">
            <input class="form-check-input" type="checkbox" name="activo" id="activo" checked>
            <label class="form-check-label" for="activo">Cliente activo</label></div>
          <button class="btn btn-primary w-100"><i class="bi bi-save"></i> Guardar cliente</button>
        </form>
      </div></div>
      <div class="col-lg-6"><div class="card p-4">
        <h5 class="mb-3"><i class="bi bi-cart-plus text-primary"></i> Nuevo pedido</h5>
        ${clientes.length === 0
          ? '<div class="alert alert-info mb-0">Primero registra al menos un cliente para poder asignarle pedidos.</div>'
          : `<form method="post" action="/pedidos">
          <div class="mb-3"><label class="form-label">Cliente (relación con la tabla clientes)</label>
            <select name="cliente_id" class="form-select" required>${opciones}</select></div>
          <div class="mb-3"><label class="form-label">Producto</label>
            <input name="producto" class="form-control" required maxlength="100" placeholder="Ej. Teclado mecánico"></div>
          <div class="row">
            <div class="col-sm-6 mb-3"><label class="form-label">Cantidad</label>
              <input name="cantidad" type="number" min="1" class="form-control" value="1" required></div>
            <div class="col-sm-6 mb-3"><label class="form-label">Precio unitario</label>
              <input name="precio" type="number" step="0.01" min="0" class="form-control" required></div>
          </div>
          <div class="mb-3"><label class="form-label">Fecha y hora del pedido</label>
            <input name="fecha_pedido" type="datetime-local" class="form-control" required></div>
          <div class="form-check form-switch mb-3">
            <input class="form-check-input" type="checkbox" name="entregado" id="entregado">
            <label class="form-check-label" for="entregado">Pedido entregado</label></div>
          <button class="btn btn-primary w-100"><i class="bi bi-save"></i> Guardar pedido</button>
        </form>`}
      </div></div>
    </div>`));
});

app.post('/clientes', async (req, res) => {
  const { nombre, email, fecha_nacimiento, genero, saldo } = req.body;
  try {
    await pool.query(
      'INSERT INTO clientes (nombre, email, fecha_nacimiento, activo, genero, saldo) VALUES (?,?,?,?,?,?)',
      [nombre, email, fecha_nacimiento, req.body.activo ? 1 : 0, genero, saldo || 0]);
    res.redirect('/registrar?ok=' + encodeURIComponent('Cliente guardado en MySQL'));
  } catch (e) {
    const msg = e.code === 'ER_DUP_ENTRY' ? 'Ese correo ya está registrado' : 'Error: ' + e.message;
    res.redirect('/registrar?error=' + encodeURIComponent(msg));
  }
});

app.post('/pedidos', async (req, res) => {
  const { cliente_id, producto, cantidad, precio, fecha_pedido } = req.body;
  try {
    await pool.query(
      'INSERT INTO pedidos (cliente_id, producto, cantidad, precio, fecha_pedido, entregado) VALUES (?,?,?,?,?,?)',
      [cliente_id, producto, cantidad, precio, fecha_pedido.replace('T', ' '), req.body.entregado ? 1 : 0]);
    res.redirect('/registrar?ok=' + encodeURIComponent('Pedido guardado en MySQL'));
  } catch (e) {
    res.redirect('/registrar?error=' + encodeURIComponent('Error: ' + e.message));
  }
});

// ---------- VER DATOS: enlace diferente que lee de MySQL ----------
app.get('/datos', async (req, res) => {
  const [clientes] = await pool.query('SELECT * FROM clientes ORDER BY id');
  const [pedidos] = await pool.query(`
    SELECT p.*, c.nombre AS cliente
    FROM pedidos p INNER JOIN clientes c ON c.id = p.cliente_id
    ORDER BY p.id`);
  const si = b => b ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>';
  const genero = g => ({ F: 'Femenino', M: 'Masculino', O: 'Otro' }[g] || g);

  const filasC = clientes.map(c => `<tr>
    <td>${c.id}</td><td>${esc(c.nombre)}</td><td>${esc(c.email)}</td><td>${esc(c.fecha_nacimiento)}</td>
    <td>${si(c.activo)}</td><td>${genero(c.genero)}</td><td class="text-end">${dinero(c.saldo)}</td></tr>`).join('')
    || '<tr><td colspan="7" class="text-center text-muted py-4">Sin registros</td></tr>';

  const filasP = pedidos.map(p => `<tr>
    <td>${p.id}</td><td>${esc(p.cliente)} <small class="text-muted">(ID ${p.cliente_id})</small></td>
    <td>${esc(p.producto)}</td><td>${p.cantidad}</td><td class="text-end">${dinero(p.precio)}</td>
    <td>${esc(p.fecha_pedido)}</td><td>${si(p.entregado)}</td></tr>`).join('')
    || '<tr><td colspan="7" class="text-center text-muted py-4">Sin registros</td></tr>';

  res.send(pagina('Datos', '/datos', `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="fw-bold mb-0">Datos almacenados en MySQL</h2>
      <span class="badge bg-primary fs-6">${clientes.length + pedidos.length} registros en total</span>
    </div>
    <div class="card p-4 mb-4">
      <h5><i class="bi bi-people text-primary"></i> Tabla <code>clientes</code> (${clientes.length})</h5>
      <div class="table-responsive"><table class="table table-hover align-middle mb-0">
        <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Nacimiento</th><th>Activo</th><th>Género</th><th class="text-end">Saldo</th></tr></thead>
        <tbody>${filasC}</tbody></table></div>
    </div>
    <div class="card p-4">
      <h5><i class="bi bi-bag text-primary"></i> Tabla <code>pedidos</code> (${pedidos.length}) <small class="text-muted fs-6">— unida a clientes con JOIN</small></h5>
      <div class="table-responsive"><table class="table table-hover align-middle mb-0">
        <thead><tr><th>ID</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th class="text-end">Precio</th><th>Fecha pedido</th><th>Entregado</th></tr></thead>
        <tbody>${filasP}</tbody></table></div>
    </div>`));
});

conectar()
  .then(() => app.listen(3000, () => console.log('🚀 Servidor en http://localhost:3000')))
  .catch(e => { console.error(e); process.exit(1); });
