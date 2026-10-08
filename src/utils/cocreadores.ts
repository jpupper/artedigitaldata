import mongoose from 'mongoose';

/**
 * Normaliza la lista de cocreadores que llega del cliente:
 * acepta ids sueltos u objetos ({_id, username}), descarta valores inválidos,
 * quita duplicados y nunca incluye al autor del posteo.
 *
 * En PATCH la lista enviada REEMPLAZA a la anterior (el cliente manda los chips completos).
 */
export function normalizeCocreadores(input: any, authorId?: any): string[] {
  if (!Array.isArray(input)) return [];

  const author = authorId ? String(authorId) : '';
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of input) {
    const value = raw && typeof raw === 'object' ? (raw._id || raw.id) : raw;
    if (!value) continue;
    const id = String(value);
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    if (author && id === author) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }

  return out;
}
