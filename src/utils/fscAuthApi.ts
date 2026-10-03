// ============================================================
// 🔐 FSC — helpers compartidos para hablar con fscauth (SERVER→SERVER)
// ------------------------------------------------------------
// Lo usan `fscAssets.ts` (fan-out del pasaporte, GET /api/fsc/assets) y
// `fscEcosystem.ts` (índice externo, GET /api/fsc/ecosystem).
//
// ⚠¿Por qué NO se llama a fscauth desde el browser?
// El front vive en artedigitaldata.com y la API de fscauth en otro origen.
// Pedirla con `Authorization` dispara un PREFLIGHT, y por fullscreencode.com los
// /api responden 307 → un redirect en un preflight está prohibido por la spec
// ("Redirect is not allowed for a preflight request") → el browser tira error de
// CORS. (Y la allowlist de CORS de fscauth ni siquiera incluye esta app.)
// server→server no hay CORS ni preflight, así que la llamada va por acá.
// ============================================================
import { Request } from 'express';

const PUBLIC_FSCAUTH = 'https://fullscreencode.com/fscauth';
const VPS_FSCAUTH = 'https://vps-4455523-x.dattaweb.com/fscauth';

/**
 * Base de la API de fscauth para llamadas server→server.
 * Preferencia: FSC_AUTH_API (en el VPS es http://localhost:3027/fscauth/api → rápido
 * y sin redirect) → FSCAUTH_URL → el VPS público. Se normaliza el `/api` final
 * (el .env lo incluye en algunos entornos) y el dominio público se reemplaza por
 * el del VPS: por fullscreencode.com/nnn 307-redirige y fetch BORRA el
 * `Authorization` cuando el redirect cambia de origen → 401 inexplicable.
 */
export const FSCAUTH_API = (
  process.env.FSC_AUTH_API || process.env.FSCAUTH_URL || VPS_FSCAUTH
)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '')
  .replace(/^https?:\/\/fullscreencode\.com/i, VPS_FSCAUTH.replace(/\/$/, ''));

/**
 * Autoriza una request de indexado: clave interna del ecosistema
 * (`x-fsc-internal`, la misma que usa fscauth para el fan-out) **o** la sesión
 * real del usuario verificada contra fscauth (solo sus propios datos, o ADMIN).
 * Fail-closed: cualquier duda → false.
 */
export async function authorizedFsc(req: Request, username: string): Promise<boolean> {
  const internal = process.env.FSC_INTERNAL_KEY || process.env.JWT_SECRET || '';
  const key = req.headers['x-fsc-internal'];
  if (internal && typeof key === 'string' && key === internal) return true;

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  try {
    const r = await fetch(`${FSCAUTH_API}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d: any = await r.json();
    if (!d || d.loggedIn !== true || !d.user) return false;
    if (String(d.user.username || '').toLowerCase() === String(username).toLowerCase()) return true;
    return d.user.role === 'ADMIN' || d.user.role === 'SYSTEM';
  } catch {
    return false;
  }
}

export { PUBLIC_FSCAUTH };
