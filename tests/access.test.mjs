import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessHandler } from '../api/access.mjs';

const env = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  APP_OWNER_EMAIL: 'owner@example.com',
  APP_OWNER_PASSWORD: 'server-only-test',
  APP_ACCESS_PASSWORD: 'test-access',
};
function request(password = 'test-access', overrides = {}) {
  return { method: 'POST', headers: { origin: 'https://app.example.com', host: 'app.example.com', 'content-type': 'application/json' }, socket: { remoteAddress: '127.0.0.1' }, body: { password }, ...overrides };
}
async function invoke(handler, req) {
  const result = { headers: {} };
  const res = {
    setHeader(name, value) { result.headers[name] = value; },
    status(status) { result.status = status; return this; },
    json(body) { result.body = body; return result; },
  };
  await handler(req, res);
  return result;
}
test('rechaza claves incorrectas antes de conectar y limita intentos', async () => {
  let clock = 0;
  const handler = createAccessHandler({ env, limits: new Map(), now: () => clock, connect() { assert.fail('No debe conectar'); } });
  for (let i = 0; i < 5; i++) assert.equal((await invoke(handler, request('wrong'))).status, 401);
  const blocked = await invoke(handler, request());
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers['Retry-After'], '600');
  clock = 600001;
  assert.equal((await invoke(handler, request('wrong'))).status, 401);
});
test('rechaza otro origen, métodos y cuerpos inválidos', async () => {
  const handler = createAccessHandler({ env, limits: new Map(), connect() { assert.fail('No debe conectar'); } });
  assert.equal((await invoke(handler, request('', { method: 'GET' }))).status, 405);
  assert.equal((await invoke(handler, request('', { headers: { origin: 'https://evil.example.com', host: 'app.example.com' } }))).status, 403);
  assert.equal((await invoke(handler, request('', { headers: { host: 'app.example.com' } }))).status, 403);
  assert.equal((await invoke(handler, request('', { headers: { origin: 'https://app.example.com', host: 'app.example.com' } }))).status, 415);
  assert.equal((await invoke(handler, request(1234))).status, 400);
  assert.equal((await invoke(handler, request('a'.repeat(129)))).status, 400);
});
test('mantiene la identidad existente y devuelve solo tokens sin credenciales', async () => {
  const handler = createAccessHandler({ env, limits: new Map(), connect(url, key, options) {
    assert.equal(url, env.VITE_SUPABASE_URL);
    assert.equal(key, env.VITE_SUPABASE_PUBLISHABLE_KEY);
    assert.equal(options.auth.persistSession, false);
    return { auth: { async signInWithPassword(credentials) {
      assert.deepEqual(credentials, { email: env.APP_OWNER_EMAIL, password: env.APP_OWNER_PASSWORD });
      return { data: { session: { access_token: 'access', refresh_token: 'refresh', user: { id: 'existing-user' } } }, error: null };
    } } };
  } });
  const result = await invoke(handler, request());
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { access_token: 'access', refresh_token: 'refresh' });
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('falla de forma cerrada sin configuración y oculta errores del proveedor', async () => {
  assert.equal((await invoke(createAccessHandler({ env: {} }), request())).status, 503);
  const handler = createAccessHandler({ env, limits: new Map(), connect() {
    return { auth: { async signInWithPassword() { throw new Error('private details'); } } };
  } });
  const result = await invoke(handler, request());
  assert.equal(result.status, 503);
  assert.ok(!JSON.stringify(result.body).includes('private details'));
});
