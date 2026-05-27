@echo off
title ADDBOT - Arte Digital Data Auto Scraper
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ===================================================
echo    ADDBOT v1.0 - Arte Digital Data Auto Scraper
echo    Busca lo mejor del dia en arte digital y lo publica
echo ===================================================
echo.

:: Cargar .env
set "ENV_FILE=%~dp0.env"
if not exist "%ENV_FILE%" (
    echo [ERROR] No se encuentra .env en %~dp0
    echo Creando .env desde .env.example...
    copy "%~dp0.env.example" "%ENV_FILE%" >nul
    echo [IMPORTANTE] Configura las variables en .env y volve a ejecutar.
    pause
    exit /b 1
)

for /f "tokens=*" %%a in ('powershell -Command "Get-Content '%ENV_FILE%' | Where-Object { $_ -match '=' -and -not $_.StartsWith('#') } | ForEach-Object { $_.Trim() }"') do (
    set "%%a"
)

:: Verificar token
if "%ADDBOT_TOKEN%"=="" (
    echo.
    echo [ADVERTENCIA] No hay ADDBOT_TOKEN configurado en .env
    echo.
    echo Para obtener un token:
    echo   1. Inicia sesion en artedigitaldata.com como admin
    echo   2. Abri DevTools ^> Application ^> Local Storage
    echo   3. Copia el valor de "artedigitaldata_token"
    echo   4. Pegalo en .env como: ADDBOT_TOKEN=tu_token_aqui
    echo.
    set /p ADDBOT_TOKEN="Ingresa el token manualmente (o Enter para salir): "
    if "!ADDBOT_TOKEN!"=="" exit /b 1
)

:: Configurar API
if "%API_BASE%"=="" set "API_BASE=https://vps-4455523-x.dattaweb.com/artedigitaldata/api"

echo [ADDBOT] API: %API_BASE%
echo [ADDBOT] Token: %ADDBOT_TOKEN:~0,20%...
echo.

:: Crear un script Node temporal para ejecutar el scraper
set "TEMP_SCRIPT=%TEMP%\addbot_run_%RANDOM%.js"

(
echo const API_BASE = '%API_BASE%';
echo const TOKEN = '%ADDBOT_TOKEN%';
echo.
echo async function fetchJSON(url, opts = {}) {
echo   const res = await fetch(url, {
echo     ...opts,
echo     headers: { ...opts.headers, 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
echo   });
echo   if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
echo   return res.json();
echo }
echo.
echo function sleep(ms) { return new Promise(r=^>setTimeout(r,ms)); }
echo.
echo async function scrapeAll() {
echo   console.log('[ADDBOT] Scrapeando fuentes...');
echo   const items = [];
echo   const seen = new Set();
echo.
echo   // 1. GITHUB TRENDING
echo   try {
echo     const res = await fetch('https://api.github.com/search/repositories?q=digital+art+creative+coding+generative+art+ai+art&sort=stars^&order=desc^&per_page=10');
echo     if (res.ok) {
echo       const data = await res.json();
echo       for (const repo of (data.items || []).slice(0,6)) {
echo         if (seen.has(repo.html_url)) continue;
echo         seen.add(repo.html_url);
echo         console.log(`  [GitHub] ${repo.full_name} ^(⭐${repo.stargazers_count}^)`);
echo         items.push({
echo           title: repo.full_name,
echo           description: repo.description ? repo.description.substring(0,200) : 'Sin descripción',
echo           url: repo.html_url,
echo           imageUrl: repo.owner?.avatar_url || '',
echo           type: 'github',
echo           score: (repo.stargazers_count || 0) + (repo.forks_count || 0)*2,
echo           source: 'GitHub'
echo         });
echo       }
echo     }
echo   } catch(e) { console.error('  [GitHub Error]', e.message); }
echo.
echo   // 2. REDDIT
echo   try {
echo     const subs = ['generative', 'creativecoding', 'digitalart', 'artificial', 'stablediffusion'];
echo     for (const sub of subs) {
echo       if (items.length >= 15) break;
echo       const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=5`, {
echo         headers: { 'User-Agent': 'ADDBOT/1.0' }
echo       });
echo       if (!res.ok) continue;
echo       const data = await res.json();
echo       for (const post of (data.data?.children || [])) {
echo         const d = post.data;
echo         if (d.stickied || d.over_18) continue;
echo         const url = d.url?.startsWith('http') ? d.url : `https://reddit.com${d.permalink}`;
echo         if (seen.has(url)) continue;
echo         seen.add(url);
echo         console.log(`  [Reddit r/${sub}] ${d.title?.substring(0,60)}`);
echo         items.push({
echo           title: (d.title || 'Sin título').substring(0,120),
echo           description: `r/${sub} | 👍 ${d.score || 0} votos | 💬 ${d.num_comments || 0} comentarios`,
echo           url: url,
echo           imageUrl: (d.url?.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) ? d.url : undefined,
echo           type: 'news',
echo           score: (d.score || 0) + (d.num_comments || 0)*3,
echo           source: `Reddit`
echo         });
echo       }
echo     }
echo   } catch(e) { console.error('  [Reddit Error]', e.message); }
echo.
echo   // 3. HACKER NEWS
echo   try {
echo     const terms = ['"digital art"', 'generative', '"creative coding"', '"ai art"', '"neural network" art'];
echo     for (const term of terms) {
echo       if (items.length >= 12) break;
echo       const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(term)}^&tags=story^&hitsPerPage=5`);
echo       if (!res.ok) continue;
echo       const data = await res.json();
echo       for (const hit of (data.hits || [])) {
echo         const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
echo         if (seen.has(url)) continue;
echo         seen.add(url);
echo         console.log(`  [HN] ${(hit.title||'').substring(0,60)}`);
echo         items.push({
echo           title: (hit.title || 'Sin título').substring(0,120),
echo           description: `Hacker News | ${hit.points || 0} points | ${hit.author || 'anon'}`,
echo           url: url,
echo           imageUrl: undefined,
echo           type: 'news',
echo           score: (hit.points || 0) + (hit.comments?.length || 0)*2,
echo           source: 'Hacker News'
echo         });
echo       }
echo     }
echo   } catch(e) { console.error('  [HN Error]', e.message); }
echo.
echo   // 4. DEV.TO
echo   try {
echo     const tags = ['digitalart', 'generativeart', 'creativecoding', 'aiart'];
echo     for (const tag of tags) {
echo       if (items.length >= 12) break;
echo       const res = await fetch(`https://dev.to/api/articles?tag=${tag}^&per_page=5`);
echo       if (!res.ok) continue;
echo       const data = await res.json();
echo       for (const article of (data || [])) {
echo         if (seen.has(article.url)) continue;
echo         seen.add(article.url);
echo         console.log(`  [Dev.to] ${(article.title||'').substring(0,60)}`);
echo         items.push({
echo           title: (article.title || 'Sin título').substring(0,120),
echo           description: `Dev.to | ${article.description?.substring(0,150) || ''}`,
echo           url: article.url,
echo           imageUrl: article.cover_image || article.social_image || '',
echo           type: 'tutorial',
echo           score: (article.positive_reactions_count || 0) * 2,
echo           source: 'DEV.to'
echo         });
echo       }
echo     }
echo   } catch(e) { console.error('  [Dev.to Error]', e.message); }
echo.
echo   // Ordenar por score (mejor contenido primero)
echo   items.sort((a,b) =^> b.score - a.score);
echo   return items;
echo }
echo.
echo async function publishPost(item) {
echo   // Si es GitHub/tutorial - publicar como Recurso
echo   if (item.type === 'github' || item.type === 'tutorial') {
echo     const body = {
echo       title: item.title,
echo       description: `🤖 Publicado automaticamente por ADDBOT\n\n${item.description}\n\nFuente: ${item.source}`,
echo       type: item.type === 'github' ? 'github' : 'tutorial',
echo       url: item.url,
echo       imageUrl: item.imageUrl || '',
echo       tags: ['addbot', 'automatico', item.source.toLowerCase().replace(/[^a-z0-9]/g,'')]
echo     };
echo     const res = await fetchJSON(`${API_BASE}/recursos`, {
echo       method: 'POST', body: JSON.stringify(body)
echo     });
echo     return { type: 'recurso', title: item.title, id: res._id };
echo   }
echo.
echo   // Si es noticia - publicar como Post
echo   const body = {
echo     title: item.title,
echo     description: `🤖 Publicado automaticamente por ADDBOT\n\n${item.description}\n\nFuente: ${item.source}\n🔗 ${item.url}`,
echo     imageUrl: item.imageUrl || '',
echo     tags: ['addbot', 'noticia', item.source.toLowerCase().replace(/[^a-z0-9]/g,'')]
echo   };
echo   const res = await fetchJSON(`${API_BASE}/posts`, {
echo     method: 'POST', body: JSON.stringify(body)
echo   });
echo   return { type: 'post', title: item.title, id: res._id };
echo }
echo.
echo async function main() {
echo   console.log('');
echo   console.log('╔══════════════════════════════════════════╗');
echo   console.log('║       ADDBOT - Scraper Intensivo         ║');
echo   console.log('╚══════════════════════════════════════════╝');
echo   console.log('');
echo.
echo   const items = await scrapeAll();
echo.
echo   if (items.length === 0) {
echo     console.log('[ADDBOT] No se encontro nada nuevo.');
echo     process.exit(0);
echo   }
echo.
echo   console.log('');
echo   console.log(`[ADDBOT] Se encontraron ${items.length} items.`);
echo   console.log('');
echo.
echo   // Elegir el MEJOR: el que tenga mayor score
echo   const best = items[0];
echo   console.log('┌──────────────────────────────────────────┐');
echo   console.log('│        MEJOR POST DEL DIA                │');
echo   console.log('├──────────────────────────────────────────┤');
echo   console.log(`│ Titulo: ${(best.title||'').substring(0,50)}`);
echo   console.log(`│ Fuente: ${best.source}`);
echo   console.log(`│ Score:  ${best.score}`);
echo   console.log(`│ Tipo:   ${best.type === 'github' ? '📦 Recurso' : '📝 Post'}`);
echo   console.log('└──────────────────────────────────────────┘');
echo   console.log('');
echo.
echo   // Publicar
echo   try {
echo     console.log('[ADDBOT] Publicando...');
echo     const result = await publishPost(best);
echo     console.log(`[ADDBOT] ✅ Publicado como ${result.type}: ${result.title}`);
echo     console.log(`[ADDBOT] 🔗 ID: ${result.id}`);
echo.
echo     // Publicar hasta 2 mas si hay (pero no mas de 3 total)
echo     for (let i = 1; i < Math.min(items.length, 3); i++) {
echo       await sleep(2000);
echo       try {
echo         const r = await publishPost(items[i]);
echo         console.log(`[ADDBOT] ✅ Adicional publicado: ${r.title}`);
echo       } catch(e) {
echo         console.log(`[ADDBOT] ⚠ No se pudo publicar adicional: ${e.message}`);
echo       }
echo     }
echo   } catch(e) {
echo     console.error(`[ADDBOT] ❌ Error publicando:`, e.message);
echo     process.exit(1);
echo   }
echo.
echo   console.log('');
echo   console.log('╔══════════════════════════════════════════╗');
echo   console.log('║   ADDBOT COMPLETADO CON EXITO           ║');
echo   console.log('╚══════════════════════════════════════════╝');
echo   process.exit(0);
echo }
echo.
echo main().catch(e=^>{console.error('FATAL:',e);process.exit(1);});
) > "%TEMP_SCRIPT%"

echo.
echo [ADDBOT] Ejecutando scraper con Node.js...
echo.

node "%TEMP_SCRIPT%"

:: Limpiar
del "%TEMP_SCRIPT%" 2>nul

echo.
if %ERRORLEVEL% equ 0 (
    echo [ADDBOT] ✅ Proceso completado exitosamente.
) else (
    echo [ADDBOT] ❌ El proceso termino con errores (codigo: %ERRORLEVEL%).
)

echo.
pause
