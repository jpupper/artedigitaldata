/**
 * Cron Manager para el Autobot
 * Programa el scraper automático para ejecutarse 1 vez al día.
 * 
 * Se integra con el server.ts como un middleware que inicia al boot.
 * También expone endpoints para ejecución manual desde el panel admin.
 */

import mongoose from 'mongoose';
import Post from '../models/Post';
import Recurso from '../models/Recurso';

const API_BASE = process.env.API_BASE || 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api';

interface ScrapedItem {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  type: 'github' | 'news' | 'tool' | 'tutorial';
  source: string;
}

// ============================
// SCRAPERS (misma lógica que autobot.ts)
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
        source: 'ia',
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
      source: 'ia',
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
// EXPORT: función para llamar desde cron o admin
// ============================

export async function runAutobot(): Promise<{ published: number; found: number; errors: string[] }> {
  console.log('═══════════════════════════════════');
  console.log('[CronBot] 🤖 Iniciando Autobot...');
  console.log('═══════════════════════════════════');

  const items = await scrapeAll();
  const errors: string[] = [];

  if (items.length === 0) {
    console.log('[CronBot] Nada nuevo encontrado.');
    return { published: 0, found: 0, errors: [] };
  }

  const toPublish = items.slice(0, 1);
  let published = 0;

  for (const item of toPublish) {
    const ok = await publishItem(item);
    if (ok) published++;
    else errors.push(item.title);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`[CronBot] ✅ Publicados ${published}/${toPublish.length}`);
  return { published, found: items.length, errors };
}
