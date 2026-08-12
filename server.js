const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PNP2026!';
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC = path.join(__dirname, 'public');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test), Buffer.from(hash));
}
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch {}
  const data = { users: { admin: { passwordHash: hashPassword(ADMIN_PASSWORD), role: 'admin', active: true } }, history: [] };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return data;
}
let data = loadData();
const sessions = new Map();

function save() { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function send(res, code, obj) { const body = JSON.stringify(obj); res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(body); }
function parseBody(req) { return new Promise((resolve,reject)=>{ let b=''; req.on('data',c=>{b+=c;if(b.length>1e6) reject(new Error('Body demasiado grande'));}); req.on('end',()=>{try{resolve(b?JSON.parse(b):{});}catch(e){reject(e);}}); }); }
function auth(req) {
  const h=req.headers.authorization||''; const token=h.startsWith('Bearer ')?h.slice(7):''; const username=sessions.get(token); if(!username) return null; return data.users[username]?{username, ...data.users[username]}:null;
}
function admin(req){ const u=auth(req); return u && u.role==='admin' ? u : null; }
function now(){return new Date().toLocaleString('es-PE',{timeZone:'America/Lima'});}
function addHistory(type, username, extra={}) { data.history.push({id:Date.now()+Math.random(),type,fecha:now(),usuario:username,...extra}); if(data.history.length>5000)data.history=data.history.slice(-5000); save(); }
function safeUsers(){return Object.entries(data.users).map(([username,u])=>({username,role:u.role,active:u.active!==false}));}

async function api(req,res,url){
  try {
    if(req.method==='POST' && url==='/api/login'){
      const {username,password}=await parseBody(req); const u=data.users[username];
      if(!u || u.active===false || !verifyPassword(password||'',u.passwordHash)) return send(res,401,{error:'Usuario o contraseña incorrectos.'});
      const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,username); addHistory('access',username,{evento:'Ingreso'}); return send(res,200,{token,username,role:u.role});
    }
    if(req.method==='GET' && url==='/api/me'){const u=auth(req); if(!u)return send(res,401,{error:'Sesión no válida.'}); return send(res,200,{username:u.username,role:u.role});}
    if(req.method==='GET' && url==='/api/users'){if(!admin(req))return send(res,403,{error:'Acceso de administrador requerido.'});return send(res,200,{users:safeUsers()});}
    if(req.method==='POST' && url==='/api/users'){
      if(!admin(req))return send(res,403,{error:'Acceso de administrador requerido.'}); const {username,password}=await parseBody(req); const u=String(username||'').trim();
      if(!u||!password)return send(res,400,{error:'Complete usuario y contraseña.'}); if(u.toLowerCase()==='admin'||data.users[u])return send(res,409,{error:'Ese usuario ya existe o está reservado.'});
      data.users[u]={passwordHash:hashPassword(String(password)),role:'usuario',active:true}; save(); return send(res,201,{ok:true});
    }
    if(req.method==='DELETE' && url.startsWith('/api/users/')){
      if(!admin(req))return send(res,403,{error:'Acceso de administrador requerido.'}); const username=decodeURIComponent(url.slice('/api/users/'.length));
      if(username==='admin')return send(res,400,{error:'No se puede eliminar al administrador.'}); if(!data.users[username])return send(res,404,{error:'Usuario no encontrado.'});
      delete data.users[username]; for(const [t,u] of sessions)if(u===username)sessions.delete(t); save(); return send(res,200,{ok:true});
    }
    if(req.method==='GET' && url==='/api/history'){if(!admin(req))return send(res,403,{error:'Acceso de administrador requerido.'});return send(res,200,{history:data.history});}
    if(req.method==='DELETE' && url==='/api/history'){if(!admin(req))return send(res,403,{error:'Acceso de administrador requerido.'});data.history=[];save();return send(res,200,{ok:true});}
    if(req.method==='POST' && url==='/api/result'){
      const u=auth(req); if(!u)return send(res,401,{error:'Sesión no válida.'}); const body=await parseBody(req); const score=Math.max(0,Math.min(100,Number(body.score)||0));
      addHistory('result',u.username,{score,pct:score,correctas:score,incorrectas:100-score}); return send(res,200,{ok:true});
    }
    return send(res,404,{error:'Ruta no encontrada.'});
  } catch(e) { console.error(e); return send(res,500,{error:'Error interno del servidor.'}); }
}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host}`).pathname;
  if(url.startsWith('/api/')) return api(req,res,url);
  if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405);return res.end();}
  let file=path.join(PUBLIC,url==='/'?'index.html':url.replace(/^\//,''));
  if(!file.startsWith(PUBLIC)) {res.writeHead(403);return res.end();}
  fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);return res.end('Not found');} const ext=path.extname(file); const type=ext==='.html'?'text/html; charset=utf-8':ext==='.css'?'text/css':ext==='.js'?'application/javascript':'application/octet-stream'; res.writeHead(200,{'Content-Type':type});res.end(buf);});
});
server.listen(PORT,()=>console.log(`Examen PNP compartido: http://localhost:${PORT}`));
