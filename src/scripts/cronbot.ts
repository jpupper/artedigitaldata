/**
 * Cron Manager para el Autobot v2
 * - Primero intenta usar Ollama (Qwen/Gemma local) para buscar y generar contenido
 * - Si Ollama no está disponible, usa los scrapers tradicionales (GitHub, HN, Reddit, DEV.to)
 * - Cuando corre con Ollama, mejora las descripciones automáticamente
 * - Solo se ejecuta si AUTOBOT_ENABLED=true en el .env local
 */

import mongoose from 'mongoose';
import Post from '../models/Post';
import Recurso from '../models/Recurso';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
const OLLAMA_TIMEOUT = 30000; // 30s para que responda el modelo

interface ScrapedItem {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  type: 'github' | 'news' | 'tool' | 'tutorial' | 'ai-generated';
  source: string;
}

// ============================
// OLLAMA — búsqueda con IA local
// ============================

/**
 * Verifica si Ollama está corriendo y responde
 */
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Llama a un modelo de Ollama (Qwen/Gemma) con un prompt y devuelve el texto generado
 */
async function ollamaChat(prompt: string, system?: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);
    
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt }
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1024,
        }
      }),
    });
    clearTimeout(timeout);
    
    if (!res.ok) {
      console.warn(`[Ollama] HTTP ${res.status}: ${res.statusText}`);
      return null;
    }
    
    const data: any = await res.json();
    return data?.message?.content || null;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[Ollama] Timeout — el modelo tardó más de 30s');
    } else {
      console.warn('[Ollama] Error:', err.message);
    }
    return null;
  }
}

/**
 * Intenta extraer JSON de la respuesta del modelo.
 * El modelo puede responder con markdown ```json ... ``` o texto plano.
 */
function extractJSON(text: string | null): any[] | null {
  if (!text) return null;
  // Intentar extraer bloque ```json
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonBlock ? jsonBlock[1] : text;
  try {
    const parsed = JSON.parse(jsonStr.trim());
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Si falla el parseo, intentar encontrar un array en el texto
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        const parsed = JSON.parse(arrMatch[0]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {}
    }
    return null;
  }
}

/**
 * Busca contenido usando Ollama: el modelo genera ideas de contenido de arte digital
 * y devuelve items estructurados que no estén ya en la base de datos.
 */
async function searchWithOllama(): Promise<ScrapedItem[]> {
  const system = `Eres un curador de arte digital. Generas contenido fresco e interesante sobre arte digital, 
arte generativo, creative coding, AI art, y herramientas para artistas digitales.

Debes responder ÚNICAMENTE con un JSON array de objetos, sin texto adicional:
[
  {
    "title": "Título atractivo del contenido",
    "description": "Descripción de 2-3 párrafos explicando por qué es interesante, qué se puede aprender, etc.",
    "url": "URL real del contenido (puede ser de GitHub, artículo, tutorial, etc.)",
    "type": "github" | "news" | "tool" | "tutorial",
    "source": "Fuente del contenido (ej: GitHub, Medium, arXiv, web)",
    "imageUrl": "URL de imagen representativa (opcional)"
}
]

Reglas:
- 1 item solamente, el más interesante
- La URL debe ser real y accesible
- El contenido debe ser relevante para artistas digitales
- Prefiere contenido en español o inglés
- Si es un recurso/herramienta, type debe ser "tool" o "github"
- Si es una noticia o artículo, type debe ser "news" o "tutorial"`;

  const prompt = `Buscá en tu conocimiento contenido actual e interesante sobre arte digital, 
arte generativo, creative coding, o herramientas AI para artistas. 

Requisitos:
- Tiene que ser contenido que valga la pena compartir en una comunidad de arte digital
- Preferí proyectos/open source, herramientas útiles, o artículos interesantes
- Si sabés URLs reales de proyectos, incluílas
- Respondé SOLO con el JSON array, nada más`;

  console.log(`[Ollama] 🤖 Consultando ${OLLAMA_MODEL}...`);
  const raw = await ollamaChat(prompt, system);
  
  if (!raw) {
    console.log('[Ollama] ⚠️ No hubo respuesta del modelo');
    return [];
  }

  const items = extractJSON(raw);
  if (!items || items.length === 0) {
    console.log('[Ollama] ⚠️ No se pudo parsear la respuesta como JSON');
    console.log(`[Ollama] Respuesta cruda: ${raw.substring(0, 200)}...`);
    return [];
  }

  // Filtrar items que ya existen en la BD
  const validItems: ScrapedItem[] = [];
  for (const item of items) {
    if (!item.title || !item.url) continue;
    if (!['github', 'news', 'tool', 'tutorial'].includes(item.type)) continue;
    
    // Verificar si ya existe
    const exists = await Recurso.findOne({ url: item.url });
    if (exists) continue;
    
    validItems.push({
      title: item.title.substring(0, 120),
      description: item.description?.substring(0, 500) || 'Contenido generado por IA',
      url: item.url,
      imageUrl: item.imageUrl || '',
      type: item.type,
      source: item.source || OLLAMA_MODEL,
    });
  }

  console.log(`[Ollama] ✅ ${validItems.length} items generados por ${OLLAMA_MODEL}`);
  return validItems;
}

/**
 * Mejora la descripción de un item usando Ollama
 */
async function enrichWithOllama(item: ScrapedItem): Promise<ScrapedItem> {
  const system = 'Sos un curador de arte digital que escribe descripciones atractivas y útiles. Respondé SOLO con el texto de la descripción mejorada, sin introducciones ni explicaciones.';
  const prompt = `Mejorá esta descripción para hacerla más atractiva para una comunidad de artistas digitales.
Mantené los datos clave pero hace que suene más interesante.

Título: ${item.title}
Descripción actual: ${item.description}
Fuente: ${item.source}
Tipo: ${item.type}`;

  const improved = await ollamaChat(prompt, system);
  if (improved) {
    return { ...item, description: improved.substring(0, 500) };
  }
  return item;
}

// ============================
// SCRAPERS TRADICIONALES (fallback)
// ============================

async function scrapeGitHubTrending(): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  try {
    const res = await fetch('https://api.github.com/search/repositories?q=digital+art+creative+coding+generative+art&sort=stars&order=desc&per_page=10');
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data: any = await res.json();
    for (const repo of (data.items || []).slice(0, 5)) {
      const exists = await Recurso.findOne({ url: repo.html_url });
      if (exists) continue;
      items.push({
        title: repo.full_name,
        description: `📦 ${(repo.description || 'Sin descripción').substring(0, 250)}\n⭐ ${repo.stargazers_count} stars | 🍴 ${repo.forks_count} forks\nLenguaje: ${repo.language || 'N/A'}`,
        url: repo.html_url,
        imageUrl: repo.owner?.avatar_url || '',
        type: 'github',
        source: 'GitHub Trending',
      });
    }
  } catch (err) {
    console.error('[CronBot] Error GitHub:', (err as Error).message);
  }
  return items;
}

async function scrapeHN(): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  try {
    const terms = ['"digital art"', 'generative', '"creative coding"', '"ai art"'];
    for (const term of terms) {
      if (items.length >= 3) break;
      const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(term)}&tags=story&hitsPerPage=5`);
      if (!res.ok) continue;
      const data: any = await res.json();
      for (const hit of (data.hits || [])) {
        const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        if (await Recurso.findOne({ url })) continue;
        if (items.find(i => i.url === url)) continue;
        items.push({
          title: (hit.title || 'Sin título').substring(0, 120),
          description: `📰 ${hit.points || 0} points en Hacker News | ${hit.author || 'anónimo'}`,
          url,
          type: 'news',
          source: 'Hacker News',
        });
      }
    }
  } catch (err) {
    console.error('[CronBot] Error HN:', (err as Error).message);
  }
  return items;
}

async function scrapeReddit(): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  try {
    const subs = ['generative', 'creativecoding', 'digitalart', 'artificial'];
    for (const sub of subs) {
      if (items.length >= 3) break;
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=5`, {
        headers: { 'User-Agent': 'ArteDigitalDataBot/1.0' }
      });
      if (!res.ok) continue;
      const data: any = await res.json();
      for (const post of (data.data?.children || [])) {
        const d = post.data;
        if (d.stickied) continue;
        const url = d.url?.startsWith('http') ? d.url : `https://reddit.com${d.permalink}`;
        if (await Recurso.findOne({ url })) continue;
        if (items.find(i => i.url === url)) continue;
        items.push({
          title: (d.title || 'Sin título').substring(0, 120),
          description: `🎨 r/${sub} | 👍 ${d.score || 0} | 💬 ${d.num_comments || 0} comentarios`,
          url,
          imageUrl: (d.url?.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) ? d.url : undefined,
          type: 'news',
          source: `Reddit r/${sub}`,
        });
      }
    }
  } catch (err) {
    console.error('[CronBot] Error Reddit:', (err as Error).message);
  }
  return items;
}

async function scrapeDevTo(): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  try {
    const tags = ['digitalart', 'generativeart', 'creativecoding', 'aiart'];
    for (const tag of tags) {
      if (items.length >= 2) break;
      const res = await fetch(`https://dev.to/api/articles?tag=${tag}&per_page=5`);
      if (!res.ok) continue;
      const data: any = await res.json();
      for (const article of (data || [])) {
        const url = article.url;
        if (await Recurso.findOne({ url })) continue;
        items.push({
          title: (article.title || 'Sin título').substring(0, 120),
          description: `📝 ${(article.description || '').substring(0, 200)}\n❤️ ${article.positive_reactions_count || 0} reacciones | 👤 ${article.user?.name || ''}`,
          url,
          imageUrl: article.cover_image || article.social_image || '',
          type: 'tutorial',
          source: 'DEV.to',
        });
      }
    }
  } catch (err) {
    console.error('[CronBot] Error DevTo:', (err as Error).message);
  }
  return items;
}

async function scrapeAll(): Promise<ScrapedItem[]> {
  const results = await Promise.allSettled([
    scrapeGitHubTrending(),
    scrapeHN(),
    scrapeReddit(),
    scrapeDevTo(),
  ]);
  const all: ScrapedItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  const seen = new Set<string>();
  return all.filter(i => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  }).slice(0, 10);
}

async function publishItem(item: ScrapedItem): Promise<boolean> {
  try {
    const botUser = await mongoose.model('User').findOne({ username: 'ADDBOT' });
    if (!botUser) {
      console.error('[CronBot] Usuario "ADDBOT" no encontrado. Ejecuta "node dist/scripts/addbot-init.js" primero.');
      return false;
    }

    if (item.type === 'github' || item.type === 'tool' || item.type === 'tutorial') {
      await Recurso.create({
        title: item.title,
        description: item.description,
        type: item.type === 'github' ? 'github' : (item.type === 'tutorial' ? 'tutorial' : 'other'),
        url: item.url,
        imageUrl: item.imageUrl || '',
        author: botUser._id,
        tags: ['autobotadd', item.source.toLowerCase().replace(/[^a-z0-9]/g, ''), 'digital-art'],
        source: item.source === OLLAMA_MODEL ? 'ia-ollama' : 'ia',
      });
      console.log(`[CronBot] ✅ Recurso: ${item.title}`);
      return true;
    }

    await Post.create({
      title: item.title,
      description: `${item.description}\n\nFuente: ${item.source}\n🔗 ${item.url}`,
      imageUrl: item.imageUrl || '',
      author: botUser._id,
      tags: ['autobotadd', 'noticia', item.source.toLowerCase().replace(/[^a-z0-9]/g, '')],
      source: item.source === OLLAMA_MODEL ? 'ia-ollama' : 'ia',
      isContest: false,
      contestMonth: '',
    });
    console.log(`[CronBot] ✅ Post: ${item.title}`);
    return true;
  } catch (err) {
    console.error(`[CronBot] Error publicando:`, (err as Error).message);
    return false;
  }
}

// ============================
// GENERATE CONTENT — API endpoint
// Búsqueda agente: Ollama genera queries → buscamos en APIs reales → Ollama sintetiza
// ============================

interface GeneratedContent {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  type: 'github' | 'tool' | 'tutorial' | 'news' | 'ai-generated';
  source: string;
  sourceQuery: string;
  reasoning: string;
  publishedAs: 'post' | 'recurso' | null;
  publishedId: string | null;
}

/**
 * FASE 1 - Ollama genera queries de búsqueda sobre tendencias actuales de arte digital
 */
async function generateSearchQueries(): Promise<string[]> {
  const system = `Eres un curador de arte digital experto. Tu tarea es generar queries de búsqueda 
que encuentren contenido REAL, actual e interesante sobre arte digital, arte generativo, 
creative coding, y herramientas AI para artistas.

Reglas:
- Generá EXACTAMENTE 5 queries de búsqueda en inglés
- Cada query debe poder buscar en APIs como GitHub, Reddit, Hacker News, DEV.to
- Preferí términos concretos (nombres de herramientas, frameworks, tendencias actuales)
- RESPONDÉ SOLO con un JSON array de strings, nada más

Ejemplo:
["stable diffusion 2025 new tools", "creative coding p5.js generative art", "ai art workflow 2025"]`;

  const prompt = `Generá 5 queries de búsqueda actuales sobre arte digital, creative coding, 
herramientas AI para artistas, o arte generativo. Cada query debe buscar contenido REAL 
que pueda encontrarse en GitHub, Reddit, HN, o DEV.to.

Respondé SOLO con un JSON array de 5 strings.`;

  console.log('[Generate] 🤖 Fase 1: Generando queries de búsqueda con ' + OLLAMA_MODEL + '...');
  const raw = await ollamaChat(prompt, system);
  if (!raw) {
    console.log('[Generate] ⚠️ No se pudieron generar queries');
    return ['digital art tools 2025', 'generative art creative coding', 'ai for artists tutorial', 'open source creative coding', 'generative art gallery'];
  }

  const queries = extractJSON(raw);
  if (!queries || !Array.isArray(queries) || queries.length === 0) {
    console.log('[Generate] ⚠️ Queries mal formateadas, usando defaults');
    return ['digital art tools 2025', 'generative art creative coding', 'ai for artists tutorial', 'open source creative coding', 'generative art gallery'];
  }

  const cleanQueries = queries.slice(0, 5).map((q: any) => String(q).trim()).filter(Boolean);
  console.log('[Generate] ✅ Queries generadas:');
  cleanQueries.forEach((q, i) => console.log(`   ${i + 1}. 🔍 "${q}"`));
  return cleanQueries;
}

/**
 * FASE 2 - Buscar en APIs reales usando las queries de Ollama
 * Busca en GitHub, Reddit, HN, DEV.to simultáneamente
 */
async function searchRealWeb(queries: string[]): Promise<ScrapedItem[]> {
  console.log('[Generate] 🌐 Fase 2: Buscando en APIs reales...');
  const allItems: ScrapedItem[] = [];

  // Buscar en GitHub con cada query
  for (const query of queries) {
    try {
      const encoded = encodeURIComponent(query + ' digital art generative');
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encoded}&sort=stars&order=desc&per_page=3`,
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );
      if (res.ok) {
        const data: any = await res.json();
        for (const repo of (data.items || []).slice(0, 2)) {
          allItems.push({
            title: repo.full_name,
            description: `📦 ${(repo.description || 'Sin descripción').substring(0, 250)}\n⭐ ${repo.stargazers_count} stars | 🍴 ${repo.forks_count} forks\nLenguaje: ${repo.language || 'N/A'}`,
            url: repo.html_url,
            imageUrl: repo.owner?.avatar_url || '',
            type: 'github',
            source: 'GitHub',
          });
        }
      }
    } catch { /* ignorar errores por query */ }
  }

  // Buscar en Reddit con las primeras 2 queries
  for (const query of queries.slice(0, 2)) {
    try {
      const res = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=hot&limit=3`,
        { headers: { 'User-Agent': 'ArteDigitalDataBot/1.0' } }
      );
      if (res.ok) {
        const data: any = await res.json();
        for (const post of (data.data?.children || []).slice(0, 2)) {
          const d = post.data;
          if (d.stickied) continue;
          const url = d.url?.startsWith('http') ? d.url : `https://reddit.com${d.permalink}`;
          allItems.push({
            title: (d.title || 'Sin título').substring(0, 120),
            description: `🎨 Reddit | 👍 ${d.score || 0} | 💬 ${d.num_comments || 0} comentarios\n${d.selftext?.substring(0, 100) || ''}`,
            url,
            imageUrl: (d.url?.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) ? d.url : undefined,
            type: 'news',
            source: 'Reddit',
          });
        }
      }
    } catch { /* ignorar */ }
  }

  // Buscar en HN con las primeras 2 queries
  for (const query of queries.slice(0, 2)) {
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=3`
      );
      if (res.ok) {
        const data: any = await res.json();
        for (const hit of (data.hits || []).slice(0, 2)) {
          const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
          allItems.push({
            title: (hit.title || 'Sin título').substring(0, 120),
            description: `📰 HN | ${hit.points || 0} points | by ${hit.author || 'anon'}`,
            url,
            type: 'news',
            source: 'Hacker News',
          });
        }
      }
    } catch { /* ignorar */ }
  }

  // Buscar en DEV.to con tags fijos
  const devTags = ['digitalart', 'generativeart', 'creativecoding', 'aiart', 'webdev'];
  for (const tag of devTags) {
    try {
      const res = await fetch(`https://dev.to/api/articles?tag=${tag}&per_page=2`);
      if (res.ok) {
        const data: any = await res.json();
        for (const article of (data || []).slice(0, 1)) {
          allItems.push({
            title: (article.title || 'Sin título').substring(0, 120),
            description: `📝 ${(article.description || '').substring(0, 200)}\n❤️ ${article.positive_reactions_count || 0} reacciones`,
            url: article.url,
            imageUrl: article.cover_image || article.social_image || '',
            type: 'tutorial',
            source: 'DEV.to',
          });
        }
      }
    } catch { /* ignorar */ }
  }

  // Si no se encontró nada, caer a fallback con tópicos fijos
  if (allItems.length === 0) {
    console.log('[Generate] ⚠️ No se encontró nada con las queries inteligentes. Cayendo a scrapers tradicionales...');
    const fallbackQueries = ['digital+art+creative+coding+generative+art', 'ai+art+tools+tutorial', 'creative+technology+generative'];
    for (const q of fallbackQueries) {
      try {
        const res = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=5`);
        if (res.ok) {
          const data: any = await res.json();
          for (const repo of (data.items || []).slice(0, 3)) {
            allItems.push({
              title: repo.full_name,
              description: `📦 ${(repo.description || 'Sin descripción').substring(0, 250)}\n⭐ ${repo.stargazers_count} stars`,
              url: repo.html_url,
              imageUrl: repo.owner?.avatar_url || '',
              type: 'github',
              source: 'GitHub Trending',
            });
          }
        }
      } catch { /* ignorar */ }
    }
  }

  // Deduplicar por URL
  const seen = new Set<string>();
  const unique = allItems.filter(i => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });

  console.log(`[Generate] ✅ Encontrados ${unique.length} items reales en la web`);
  return unique.slice(0, 10);
}

/**
 * FASE 3 - Ollama rankea y enriquece los resultados reales
 * El modelo elige los mejores items y escribe descripciones atractivas
 */
async function rankAndEnrich(results: ScrapedItem[]): Promise<GeneratedContent[]> {
  console.log('[Generate] 🤖 Fase 3: Rankeando y enriqueciendo resultados con ' + OLLAMA_MODEL + '...');

  if (results.length === 0) return [];

  const itemsJson = results.map((r, i) => ({
    index: i + 1,
    title: r.title,
    source: r.source,
    type: r.type,
    url: r.url,
    description: r.description,
  }));

  const system = `Sos un curador de arte digital experto. Tu tarea es seleccionar los MEJORES 
3-5 items de una lista de resultados de búsqueda reales y escribir una descripción 
atractiva para cada uno.

Reglas:
- Elegí los más interesantes y relevantes para una comunidad de artistas digitales
- Descartá contenido duplicado, genérico, o de baja calidad
- Para cada item elegido, escribí una descripción atractiva de 2-3 párrafos
- La descripción debe explicar: qué es, por qué es interesante, y qué se puede aprender
- Respondé SOLO con JSON, nada más`;

  const prompt = `Acá están los resultados de búsqueda REALES de GitHub, Reddit, HN y DEV.to 
sobre arte digital. Seleccioná los 3-5 items más interesantes para compartir en una 
comunidad de arte digital.

Resultados:
${JSON.stringify(itemsJson, null, 2)}

Respondé SOLO con un JSON array de objetos, cada uno con:
{
  "index": number,
  "reasoning": string,
  "improvedTitle": string,
  "improvedDescription": string
}`;

  const raw = await ollamaChat(prompt, system);
  if (!raw) {
    console.log('[Generate] ⚠️ Ollama no pudo rankear. Usando top 3 crudos.');
    return results.slice(0, 3).map(r => ({
      title: r.title,
      description: r.description,
      url: r.url,
      imageUrl: r.imageUrl,
      type: r.type,
      source: r.source,
      sourceQuery: '',
      reasoning: 'Seleccionado automáticamente',
      publishedAs: null,
      publishedId: null,
    }));
  }

  const ranking = extractJSON(raw);
  if (!ranking || !Array.isArray(ranking) || ranking.length === 0) {
    console.log('[Generate] ⚠️ No se pudo parsear ranking. Usando top 3.');
    return results.slice(0, 3).map(r => ({
      title: r.title,
      description: r.description,
      url: r.url,
      imageUrl: r.imageUrl,
      type: r.type,
      source: r.source,
      sourceQuery: '',
      reasoning: 'Seleccionado automáticamente',
      publishedAs: null,
      publishedId: null,
    }));
  }

  const generated: GeneratedContent[] = [];
  for (const rank of ranking) {
    const idx = (rank.index || 1) - 1;
    const item = results[idx];
    if (!item) continue;

    generated.push({
      title: (rank.improvedTitle || item.title).substring(0, 120),
      description: (rank.improvedDescription || item.description).substring(0, 500),
      url: item.url,
      imageUrl: item.imageUrl,
      type: item.type,
      source: item.source,
      sourceQuery: '',
      reasoning: rank.reasoning || 'Relevante para la comunidad',
      publishedAs: null,
      publishedId: null,
    });
  }

  console.log(`[Generate] ✅ ${generated.length} items rankeados y enriquecidos por ${OLLAMA_MODEL}`);
  return generated.slice(0, 5);
}

/**
 * FASE 4 - Publicar en la base de datos
 */
async function publishGenerated(items: GeneratedContent[], publishToDB: boolean): Promise<GeneratedContent[]> {
  if (!publishToDB) {
    console.log('[Generate] 📋 Modo previsualización — NO se publica en BD');
    return items;
  }

  console.log('[Generate] 💾 Fase 4: Publicando en base de datos...');
  const botUser = await mongoose.model('User').findOne({ username: 'ADDBOT' });

  for (const item of items) {
    try {
      // Verificar si ya existe
      const existingRecurso = await Recurso.findOne({ url: item.url });
      if (existingRecurso) {
        console.log(`[Generate] ⏭️ Ya existe: ${item.title}`);
        continue;
      }

      if (item.type === 'github' || item.type === 'tool' || item.type === 'tutorial') {
        const recurso = await Recurso.create({
          title: item.title,
          description: item.description + `\n\n🤖 Seleccionado por IA: ${item.reasoning}`,
          type: item.type === 'github' ? 'github' : (item.type === 'tutorial' ? 'tutorial' : 'other'),
          url: item.url,
          imageUrl: item.imageUrl || '',
          author: botUser ? botUser._id : undefined,
          tags: ['autobotadd', item.source.toLowerCase().replace(/[^a-z0-9]/g, ''), 'digital-art', 'ia-generated'],
          source: 'ia-ollama',
        });
        item.publishedAs = 'recurso';
        item.publishedId = String(recurso._id);
        console.log(`[Generate] ✅ Recurso publicado: ${item.title}`);
      } else {
        const post = await Post.create({
          title: item.title,
          description: `${item.description}\n\n🔗 ${item.url}\nFuente: ${item.source}\n🤖 Seleccionado por IA: ${item.reasoning}`,
          imageUrl: item.imageUrl || '',
          author: botUser ? botUser._id : undefined,
          tags: ['autobotadd', 'noticia', item.source.toLowerCase().replace(/[^a-z0-9]/g, ''), 'ia-generated'],
          source: 'ia-ollama',
          isContest: false,
          contestMonth: '',
        });
        item.publishedAs = 'post';
        item.publishedId = String(post._id);
        console.log(`[Generate] ✅ Post publicado: ${item.title}`);
      }
    } catch (err: any) {
      console.error(`[Generate] ❌ Error publicando "${item.title}":`, err.message);
    }
  }

  const published = items.filter(i => i.publishedAs).length;
  console.log(`[Generate] ✅ ${published}/${items.length} items publicados`);
  return items;
}

// ============================
// EXPORT FUNCTIONS
// ============================

/**
 * generateContent — API endpoint para generar contenido con IA
 * Usa el patrón agente: Ollama idea → búsqueda real web → Ollama sintetiza → publica
 */
export async function generateContent(params: {
  topic?: string;
  maxItems?: number;
  publish?: boolean;
  previewOnly?: boolean;
} = {}): Promise<{
  success: boolean;
  mode: string;
  queries: string[];
  found: number;
  generated: GeneratedContent[];
  published: number;
  errors: string[];
  ollamaAvailable: boolean;
  ollamaModel: string;
}> {
  console.log('══════════════════════════════════════');
  console.log('[Generate] 🤖 Iniciando generación agente de contenido...');
  console.log('══════════════════════════════════════');

  const errors: string[] = [];
  const topic = params.topic || '';
  const maxItems = params.maxItems || 3;
  const publishToDB = params.publish !== false;

  // Verificar Ollama
  const ollamaAvailable = await isOllamaAvailable();
  if (!ollamaAvailable) {
    console.log('[Generate] ⚠️ Ollama no disponible. Usando solo scrapers tradicionales.');
  } else {
    console.log(`[Generate] ✅ ${OLLAMA_MODEL} disponible en ${OLLAMA_URL}`);
  }

  // FASE 1: Generar queries (solo si Ollama disponible)
  let queries: string[] = [];
  if (ollamaAvailable) {
    try {
      queries = await generateSearchQueries();
      if (topic) {
        queries.unshift(topic);
        queries = queries.slice(0, 5);
      }
    } catch (err: any) {
      errors.push(`Error generando queries: ${err.message}`);
      queries = [topic || 'digital art tools', 'generative art creative coding', 'ai for artists'];
    }
  } else {
    queries = [topic || 'digital+art+creative+coding', 'generative+art+tools', 'ai+art+creative+technology'];
  }

  // FASE 2: Buscar en APIs reales
  let searchResults: ScrapedItem[];
  try {
    searchResults = await searchRealWeb(queries);
  } catch (err: any) {
    errors.push(`Error en búsqueda web: ${err.message}`);
    searchResults = [];
  }

  if (searchResults.length === 0) {
    console.log('[Generate] ⚠️ No se encontró nada en la web.');
    return {
      success: false,
      mode: ollamaAvailable ? 'ollama+web' : 'scrapers-only',
      queries,
      found: 0,
      generated: [],
      published: 0,
      errors: errors.length > 0 ? errors : ['No se encontró contenido'],
      ollamaAvailable,
      ollamaModel: OLLAMA_MODEL,
    };
  }

  // FASE 3: Rankear y enriquecer con Ollama (si disponible)
  let generated: GeneratedContent[];
  if (ollamaAvailable) {
    try {
      generated = await rankAndEnrich(searchResults);
    } catch (err: any) {
      errors.push(`Error en ranking Ollama: ${err.message}`);
      generated = searchResults.slice(0, maxItems).map(r => ({
        title: r.title,
        description: r.description,
        url: r.url,
        imageUrl: r.imageUrl,
        type: r.type,
        source: r.source,
        sourceQuery: '',
        reasoning: 'Seleccionado automáticamente por Ollama (fallback)',
        publishedAs: null,
        publishedId: null,
      }));
    }
  } else {
    generated = searchResults.slice(0, maxItems).map(r => ({
      title: r.title,
      description: r.description,
      url: r.url,
      imageUrl: r.imageUrl,
      type: r.type,
      source: r.source,
      sourceQuery: '',
      reasoning: 'Seleccionado automáticamente (Ollama no disponible)',
      publishedAs: null,
      publishedId: null,
    }));
  }

  // Limitar a maxItems
  generated = generated.slice(0, maxItems);

  // FASE 4: Publicar
  generated = await publishGenerated(generated, publishToDB);

  const published = generated.filter(i => i.publishedAs).length;

  console.log('══════════════════════════════════════');
  console.log(`[Generate] ✅ Completado. Publicados: ${published}/${generated.length}`);
  console.log('══════════════════════════════════════');

  return {
    success: true,
    mode: ollamaAvailable ? 'ollama+web' : 'scrapers-only',
    queries,
    found: searchResults.length,
    generated,
    published,
    errors,
    ollamaAvailable,
    ollamaModel: OLLAMA_MODEL,
  };
}

export async function runAutobot(): Promise<{ published: number; found: number; errors: string[] }> {
  console.log('═══════════════════════════════════');
  console.log('[CronBot] 🤖 Iniciando Autobot...');
  console.log('═══════════════════════════════════');

  const errors: string[] = [];
  let items: ScrapedItem[] = [];

  // INTENTAR CON OLLAMA PRIMERO
  const ollamaAvailable = await isOllamaAvailable();
  if (ollamaAvailable) {
    console.log(`[Ollama] ✅ ${OLLAMA_MODEL} disponible en ${OLLAMA_URL}`);
    items = await searchWithOllama();

    // Enriquecer descripciones con Ollama
    if (items.length > 0) {
      console.log('[Ollama] ✨ Mejorando descripciones...');
      const enriched = await Promise.all(
        items.slice(0, 3).map(item => enrichWithOllama(item))
      );
      for (let i = 0; i < enriched.length; i++) {
        const idx = items.findIndex(it => it.url === enriched[i].url);
        if (idx >= 0) items[idx] = enriched[i];
      }
    }
  } else {
    console.log('[Ollama] ⚠️ No disponible — usando scrapers tradicionales');
    console.log(`          Instalá Ollama (ollama.com) y corré: ollama pull ${OLLAMA_MODEL}`);
  }

  // FALLBACK: scrapers si Ollama no encontró nada
  if (items.length === 0) {
    console.log('[CronBot] Usando scrapers (GitHub, HN, Reddit, DEV.to)...');
    items = await scrapeAll();
  }

  if (items.length === 0) {
    console.log('[CronBot] Nada nuevo encontrado.');
    return { published: 0, found: 0, errors: [] };
  }

  // Publicar solo 1 item por ejecución
  const toPublish = items.slice(0, 1);
  let published = 0;

  for (const item of toPublish) {
    const ok = await publishItem(item);
    if (ok) published++;
    else errors.push(item.title);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`[CronBot] ✅ Publicados ${published}/${toPublish.length} (encontrados ${items.length})`);
  return { published, found: items.length, errors };
}
