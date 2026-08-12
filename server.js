const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PNP2026!';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLIC = __dirname;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(':');
    if (!salt || !hash) return false;
    const test = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(test, 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

async function getUser(username) {
  const { data, error } = await supabase
    .from('users')
    .select('username,password_hash,role,active')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureAdmin() {
  const existing = await getUser('admin');
  if (!existing) {
    const { error } = await supabase.from('users').insert({
      username: 'admin',
      password_hash: hashPassword(ADMIN_PASSWORD),
      role: 'admin',
      active: true
    });
    if (error) throw error;
    console.log('Administrador inicial creado.');
  } else {
    // Asegura que la contraseña definida en ADMIN_PASSWORD sea válida
    // incluso si el usuario admin ya existía de una instalación anterior.
    const { error } = await supabase.from('users').update({
      password_hash: hashPassword(ADMIN_PASSWORD),
      role: 'admin',
      active: true
    }).eq('username', 'admin');
    if (error) throw error;
    console.log('Administrador verificado/actualizado.');
  }
}

const sessions = new Map();

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => {
      b += c;
      if (b.length > 1e6) reject(new Error('Body demasiado grande'));
    });
    req.on('end', () => {
      try { resolve(b ? JSON.parse(b) : {}); }
      catch (e) { reject(e); }
    });
  });
}

async function auth(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const username = sessions.get(token);
  if (!username) return null;
  const u = await getUser(username);
  if (!u || u.active === false) return null;
  return u;
}

async function admin(req) {
  const u = await auth(req);
  return u && u.role === 'admin' ? u : null;
}

async function addHistory(type, username, extra = {}) {
  const row = {
    type,
    usuario: username,
    evento: extra.evento || null,
    score: extra.score ?? null,
    pct: extra.pct ?? null,
    correctas: extra.correctas ?? null,
    incorrectas: extra.incorrectas ?? null
  };
  const { error } = await supabase.from('history').insert(row);
  if (error) throw error;
}

async function safeUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('username,role,active,created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function api(req, res, url) {
  try {
    if (req.method === 'POST' && url === '/api/login') {
      const { username, password } = await parseBody(req);
      const u = await getUser(String(username || '').trim());
      if (!u || u.active === false || !verifyPassword(String(password || ''), u.password_hash)) {
        return send(res, 401, { error: 'Usuario o contraseña incorrectos.' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, u.username);
      await addHistory('access', u.username, { evento: 'Ingreso' });
      return send(res, 200, { token, username: u.username, role: u.role });
    }

    if (req.method === 'GET' && url === '/api/me') {
      const u = await auth(req);
      if (!u) return send(res, 401, { error: 'Sesión no válida.' });
      return send(res, 200, { username: u.username, role: u.role });
    }

    if (req.method === 'GET' && url === '/api/users') {
      if (!await admin(req)) return send(res, 403, { error: 'Acceso de administrador requerido.' });
      return send(res, 200, { users: await safeUsers() });
    }

    if (req.method === 'POST' && url === '/api/users') {
      if (!await admin(req)) return send(res, 403, { error: 'Acceso de administrador requerido.' });
      const { username, password } = await parseBody(req);
      const u = String(username || '').trim();
      if (!u || !password) return send(res, 400, { error: 'Complete usuario y contraseña.' });
      if (u.toLowerCase() === 'admin') return send(res, 409, { error: 'Ese usuario está reservado.' });
      if (String(password).length < 4) return send(res, 400, { error: 'La contraseña debe tener al menos 4 caracteres.' });

      const existing = await getUser(u);
      if (existing) return send(res, 409, { error: 'Ese usuario ya existe.' });

      const { error } = await supabase.from('users').insert({
        username: u,
        password_hash: hashPassword(String(password)),
        role: 'usuario',
        active: true
      });
      if (error) throw error;
      return send(res, 201, { ok: true });
    }

    if (req.method === 'DELETE' && url.startsWith('/api/users/')) {
      if (!await admin(req)) return send(res, 403, { error: 'Acceso de administrador requerido.' });
      const username = decodeURIComponent(url.slice('/api/users/'.length));
      if (username === 'admin') return send(res, 400, { error: 'No se puede eliminar al administrador.' });
      const existing = await getUser(username);
      if (!existing) return send(res, 404, { error: 'Usuario no encontrado.' });
      const { error } = await supabase.from('users').delete().eq('username', username);
      if (error) throw error;
      for (const [t, u] of sessions) if (u === username) sessions.delete(t);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url === '/api/history') {
      if (!await admin(req)) return send(res, 403, { error: 'Acceso de administrador requerido.' });
      const { data, error } = await supabase.from('history').select('*').order('fecha', { ascending: false }).limit(5000);
      if (error) throw error;
      return send(res, 200, { history: data || [] });
    }

    if (req.method === 'DELETE' && url === '/api/history') {
      if (!await admin(req)) return send(res, 403, { error: 'Acceso de administrador requerido.' });
      const { error } = await supabase.from('history').delete().not('id', 'is', null);
      if (error) throw error;
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url === '/api/result') {
      const u = await auth(req);
      if (!u) return send(res, 401, { error: 'Sesión no válida.' });
      const body = await parseBody(req);
      const score = Math.max(0, Math.min(100, Number(body.score) || 0));
      await addHistory('result', u.username, {
        score,
        pct: score,
        correctas: Number(body.correctas) || score,
        incorrectas: Number(body.incorrectas) || (100 - score)
      });
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'Ruta no encontrada.' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Error interno del servidor.' });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (url.startsWith('/api/')) return api(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end();
  }
  let file = path.join(PUBLIC, url === '/' ? 'index.html' : url.replace(/^\//, ''));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(file);
    const type = ext === '.html' ? 'text/html; charset=utf-8'
      : ext === '.css' ? 'text/css; charset=utf-8'
      : ext === '.js' ? 'application/javascript; charset=utf-8'
      : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(buf);
  });
});

ensureAdmin()
  .then(() => server.listen(PORT, () => console.log(`Examen PNP compartido escuchando en el puerto ${PORT}`)))
  .catch(err => {
    console.error('No se pudo inicializar Supabase:', err);
    process.exit(1);
  });
