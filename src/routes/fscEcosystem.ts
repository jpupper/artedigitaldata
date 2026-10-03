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

const APP_ID = 'artedigitaldata';
const CACHE_TTL_MS = 60_000;   // el índice del usuario cambia lento
const UPSTREAM_MS = 20_000;    // el fan-out de fscauth es lento por diseño
const CACHE_MAX = 200;

const cache = new Map<string, { at: number; data: unknown }>();

// Últimos tipos vistos en un fan-out, para que /fsc/catalog pueda contestar sin
// sesión (el catálogo de apps sale del registro público de fscauth; los TIPOS
// sólo existen dentro del índice de cada usuario).
let ultimosTipos: Array<{ type: string; label: string }> = [];

// ════════════════════════════════════════════════════════════
// Catálogo del ecosistema: QUÉ app y QUÉ tipo de cosa, con los totales
// indexados. Se arma con el fan-out (totales) + el registro público de fscauth
// (`GET /api/apps`: etiqueta, descripción y URL humana), para que CUALQUIER
// página pueda replicar la misma data y los mismos filtros.
// ════════════════════════════════════════════════════════════
async function catalogoDe(data: any) {
  const apps: any[] = Array.isArray(data && data.apps) ? data.apps : [];

  let registro: Record<string, { label?: string; url?: string; desc?: string }> = {};
  try {
    const r = await fetch(`${FSCAUTH_API}/api/apps`, { signal: AbortSignal.timeout(5000) });
    const reg: any = await r.json();
    (reg && reg.apps ? reg.apps : []).forEach((a: any) => { registro[a.id] = a; });
  } catch (e) {
    // fail-soft: sin el registro igual devolvemos el catálogo del fan-out
    console.warn('[FSC-CATALOGO] sin registro de apps:', (e as any) && (e as any).message);
  }

  const tipos = new Map<string, { type: string; label: string; count: number }>();
  const externas = apps.filter((a) => a && a.id !== APP_ID).map((a) => {
    (a.groups || []).forEach((g: any) => {
      const t = tipos.get(g.type) || { type: g.type, label: g.label || g.type, count: 0 };
      t.count += Number(g.count || 0);
      tipos.set(g.type, t);
    });
    const meta = registro[a.id] || ({} as any);
    return {
      id: a.id,
      label: meta.label || a.label || a.id,
      desc: meta.desc || '',
      url: meta.url || '',
      ok: a.ok !== false,
      total: Number(a.total || 0)
    };
  });

  const listaTipos = Array.from(tipos.values()).sort((x, y) => y.count - x.count);
  if (listaTipos.length) ultimosTipos = listaTipos.map((t) => ({ type: t.type, label: t.label }));
  return { apps: externas, types: listaTipos };
}

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

    const conCatalogo = { ...data, catalog: await catalogoDe(data) };
    cache.set(key, { at: Date.now(), data: conCatalogo });
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return res.json(conCatalogo);
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

// ════════════════════════════════════════════════════════════
// GET /artedigitaldata/api/fsc/ecosystem/catalog   (SIN sesión)
// El mismo catálogo (QUÉ app y QUÉ tipo de cosa) para que cualquier página del
// sitio arme los mismos filtros sin depender de una sesión: las apps salen del
// registro público de fscauth y los tipos, del último fan-out que se indexó.
// ════════════════════════════════════════════════════════════
router.get('/catalog', async (_req: Request, res: Response) => {
  try {
    const r = await fetch(`${FSCAUTH_API}/api/apps`, { signal: AbortSignal.timeout(5000) });
    const reg: any = await r.json();
    const apps = (reg && reg.apps ? reg.apps : [])
      .filter((a: any) => a && a.id !== APP_ID)
      .map((a: any) => ({ id: a.id, label: a.label, desc: a.desc || '', icon: a.icon || '', url: a.url || '' }));
    return res.json({ ok: true, apps, types: ultimosTipos });
  } catch (err: any) {
    console.error('[FSC-CATALOGO] error:', err && err.message);
    return res.status(502).json({ ok: false, error: 'No pude leer el registro del ecosistema' });
  }
});

/** Solo para tests: vacía la caché en memoria. */
export function limpiarCacheEcosistema() { cache.clear(); }

export default router;
