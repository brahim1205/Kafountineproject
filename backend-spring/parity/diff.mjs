// Rejoue les mêmes requêtes sur Node (3000) et Spring (3002) et compare statut et corps normalisés.
// Usage : node diff.mjs scenarios/s-x.mjs [...]
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const BASES = { node: 'http://127.0.0.1:3000', spring: 'http://127.0.0.1:3002' };
const ORIGIN = 'http://127.0.0.1:5173';
const UUID_G = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const BACKUP = /backup-\d{4}-\d{2}-\d{2}_[\d-]+\.json/g;
const started = Date.now() - 120_000;
// Un uuid absent de la base de départ a été créé pendant le scénario : il diffère forcément.
const seeded = new Set(execFileSync('pg_dump', ['-h', '127.0.0.1', '-p', '55432', '-U', 'postgres', '--data-only', 'kaf_seeded'], { encoding: 'utf8', maxBuffer: 1 << 28 }).match(UUID_G));

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) if (k !== 'requestId') out[k] = normalize(value[k]);
    return out;
  }
  if (typeof value !== 'string') return value;
  if (ISO.test(value) && Date.parse(value) >= started) return '<now>';
  return value.replace(BACKUP, 'backup-<now>.json').replace(UUID_G, (id) => (seeded.has(id) ? id : '<new-id>'));
}

const tokens = { node: {}, spring: {} };
const saved = { node: {}, spring: {} };
const fill = (text, side) => text.replace(/\{\{(\w+)\.([\w.]+)\}\}/g, (_, name, p) => {
  let v = saved[side][name];
  for (const k of p.split('.')) v = v?.[k];
  return v ?? '';
});

async function call(side, step) {
  const headers = { origin: ORIGIN, 'content-type': 'application/json' };
  const who = step.as === undefined ? 'admin' : step.as;
  if (who && tokens[side][who]) headers.authorization = `Bearer ${tokens[side][who]}`;
  const body = step.body === undefined ? undefined : fill(typeof step.body === 'string' ? step.body : JSON.stringify(step.body), side);
  const res = await fetch(BASES[side] + fill(step.path, side), { method: step.method ?? 'GET', headers, body });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = step.raw || text.length <= 300 ? text : `<${res.headers.get('content-type')} ${text.length}o>`; }
  if (step.save) saved[side][step.save] = json;
  if (step.headers) json = { headers: Object.fromEntries(step.headers.map((h) => [h, h === 'content-type' ? res.headers.get(h)?.replace(/;\s*/g, '; ') : res.headers.get(h)])), body: json };
  return { status: res.status, json };
}

async function login(as, email, password) {
  if (tokens.node[as] && tokens.spring[as]) return;
  for (const side of ['node', 'spring']) {
    const res = await fetch(BASES[side] + '/api/v1/auth/login', { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('auth_token='));
    if (!cookie) throw new Error(`${side} login ${email}: ${res.status} ${await res.text()}`);
    tokens[side][as] = cookie.split(';')[0].slice('auth_token='.length);
  }
}

let failures = 0, total = 0;
for (const file of process.argv.slice(2)) {
  const { default: scenario } = await import(pathToFileURL(path.resolve(file)).href);
  await scenario.setup?.(login);
  for (const step of scenario.steps) {
    total++;
    const [n, s] = [await call('node', step), await call('spring', step)];
    const a = normalize({ status: n.status, body: n.json });
    const b = normalize({ status: s.status, body: s.json });
    const label = `${step.method ?? 'GET'} ${step.path}${step.as ? ` (${step.as})` : ''}${step.note ? ` — ${step.note}` : ''}`;
    if (JSON.stringify(a) === JSON.stringify(b)) { console.log(`  ok  ${label}`); continue; }
    failures++;
    const paths = [];
    const walk = (x, y, p) => {
      if (paths.length >= 8 || JSON.stringify(x) === JSON.stringify(y)) return;
      if (x && y && typeof x === 'object' && typeof y === 'object') for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], `${p}.${k}`);
      else paths.push(`${p}: node=${JSON.stringify(x)?.slice(0, 200)} spring=${JSON.stringify(y)?.slice(0, 200)}`);
    };
    walk(a, b, '');
    console.log(`  KO  ${label}\n      ${paths.join('\n      ')}`);
  }
}
console.log(`\n${total - failures}/${total} identiques`);
process.exit(failures ? 1 : 0);
