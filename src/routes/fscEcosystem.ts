// ============================================================
// 🌐 FSC — ÍNDICE EXTERNO: "todo lo que NO vive en artedigitaldata"
// GET /artedigitaldata/api/fsc/ecosystem?username=X
//
// Internal = lo creado en esta app (lo sirve /api/fsc/assets).
// External = las creaciones del MISMO usuario en el RESTO de las apps del
// ecosistema. NO se copian: se le piden a fscauth, que hace fan-out a cada app.
//
// ⚠ ESTE PROXY EXISTE POR UN BUG REAL (02-Oct-2026): el front pedía
// `https://fullscreencode.com/fscauth/api/auth/assets` desde artedigitaldata.com
// con `Authorization` → el browser mandaba un PREFLIGHT, Apache respondía 307 al
// VPS y un redirect en un preflight está prohibido →
// "Redirect is not allowed for a preflight request" + ERR_FAILED.
// Acá el browser le pega a SU propia API (allowlist ya configurada) y el
// server→server no tiene CORS.
//
// Además CACHEA: el fan-out de fscauth consulta TODAS las apps registradas y
// tarda segundos; sin caché cada visita al perfil vuelve a esperar.
// ============================================================
import { Router, Request, Response } from 'express';
import { authorizedFsc, FSCAUTH_API } from '../utils/fscAuthApi';

const router = Router();

const CACHE_TTL_MS = 60_000;   // el índice del usuario cambia lento
const UPSTREAM_MS = 20_000;    // el fan-out de fscauth es lento por diseño
const CACHE_MAX = 200;

const cache = new Map<string, { at: number; data: unknown }>();

router.get('/', async (req: Request, res: Response) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ ok: false, error: 'username requerido' });
  if (!(await authorizedFsc(req, username))) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  const key = username.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.json({ ...(hit.data as Record<string, unknown>), cached: true });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const internal = process.env.FSC_INTERNAL_KEY || process.env.JWT_SECRET || '';
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (internal) headers['x-fsc-internal'] = internal;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_MS);
  try {
    const url = `${FSCAUTH_API}/api/auth/assets?username=${encodeURIComponent(username)}`;
    const r = await fetch(url, { headers, signal: ctrl.signal });
    const data: any = await r.json().catch(() => null);

    if (!r.ok || !data || !data.ok) {
      // 403/401 de fscauth (no es tu usuario) se propagan tal cual;
      // el resto es un problema nuestro hablando con fscauth.
      const code = r.status === 401 || r.status === 403 ? r.status : 502;
      return res.status(code).json({
        ok: false,
        error: (data && data.error) || 'No se pudo indexar el ecosistema'
      });
    }

    cache.set(key, { at: Date.now(), data });
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return res.json(data);
  } catch (err: any) {
    const timeOut = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
    console.error('[FSC-ECOSYSTEM] error:', err && err.message);
    return res.status(timeOut ? 504 : 502).json({
      ok: false,
      error: timeOut ? 'El ecosistema tardó demasiado en responder' : 'No se pudo indexar el ecosistema'
    });
  } finally {
    clearTimeout(timer);
  }
});

/** Solo para tests: vacía la caché en memoria. */
export function limpiarCacheEcosistema() { cache.clear(); }

export default router;
