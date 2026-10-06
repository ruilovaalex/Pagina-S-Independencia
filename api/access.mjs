import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// This limiter is per function instance. Use Vercel Firewall for a shared limit.
const attempts = new Map();
const WINDOW = 10 * 60 * 1000;

export function createAccessHandler({ env = process.env, connect = createClient, limits = attempts, now = Date.now } = {}) {
  return async function access(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => res.status(status).json(body);
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return send(405, { error: 'Método no permitido.' });
    }
    try {
      if (!req.headers.origin || new URL(req.headers.origin).host !== req.headers.host) {
        return send(403, { error: 'Solicitud no permitida.' });
      }
    } catch { return send(403, { error: 'Solicitud no permitida.' }); }
    if (!req.headers['content-type']?.startsWith('application/json')) {
      return send(415, { error: 'Formato no permitido.' });
    }
    const url = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const email = env.APP_OWNER_EMAIL;
    const ownerPassword = env.APP_OWNER_PASSWORD;
    const accessPassword = env.APP_ACCESS_PASSWORD;
    if (!url || !key || !email || !ownerPassword || !accessPassword) {
      return send(503, { error: 'Falta configurar el acceso privado en Vercel.' });
    }
    const timestamp = now();
    for (const [ip, entry] of limits) {
      if (timestamp >= entry.until) limits.delete(ip);
    }
    // Vercel supplies this header; never use a client-supplied forwarding chain.
    const ip = req.headers['x-vercel-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown';
    const entry = limits.get(ip) ?? { count: 0, until: timestamp + WINDOW };
    if (entry.count >= 5 || (!limits.has(ip) && limits.size >= 10000)) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.until - timestamp) / 1000))));
      return send(429, { error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' });
    }
    entry.count++;
    limits.set(ip, entry);
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length > 128) {
      return send(400, { error: 'Introduce tu contraseña.' });
    }
    const digest = value => createHash('sha256').update(value).digest();
    if (!timingSafeEqual(digest(password), digest(accessPassword))) {
      return send(401, { error: 'Contraseña incorrecta.' });
    }
    try {
      // Keep the existing user's identity and RLS; no privileged database key.
      const supabase = connect(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: ownerPassword });
      if (error || !data.session) {
        return send(503, { error: 'No se pudo abrir tu espacio. Revisa la conexión y las credenciales privadas.' });
      }
      limits.delete(ip);
      return send(200, {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    } catch {
      return send(503, { error: 'No se pudo conectar. Vuelve a intentarlo en unos momentos.' });
    }
  };
}

export default createAccessHandler();
