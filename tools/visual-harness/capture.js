// Captura un snapshot de cada página en cada viewport.
//   node tools/visual-harness/capture.js <label> [--record]
// El label nombra la carpeta de salida (p. ej. "before" / "after").
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./server');
const netcache = require('./netcache');
const PAGES = require('./pages');

// Cualquier fecha sirve mientras sea la misma en las dos corridas.
const FIXED_DATE = '2026-08-17T15:00:00.000Z';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];


// Congela cualquier animación en su fotograma inicial. Pausamos en vez de
// desactivar para que un `animate-*` faltante siga notándose: el elemento
// se queda en el keyframe 0, no en el estado sin animación.
// Resuelve cuando pasan `quietMs` sin mutaciones en el DOM, o al llegar a `maxMs`.
async function waitForQuiescence(page, { quietMs = 800, maxMs = 15000 } = {}) {
  await page.evaluate(
    ({ quietMs, maxMs }) =>
      new Promise((resolve) => {
        let timer;
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(done, quietMs);
        });
        const done = () => {
          clearTimeout(timer);
          clearTimeout(hardStop);
          observer.disconnect();
          // Dos rAF más para dejar asentar el layout del último cambio.
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        };
        const hardStop = setTimeout(done, maxMs);
        timer = setTimeout(done, quietMs);
        observer.observe(document.documentElement, {
          childList: true, subtree: true, attributes: true, characterData: true,
        });
      }),
    { quietMs, maxMs },
  ).catch(() => {});
}

async function freeze(page) {
  await page.evaluate(() => {
    for (const anim of document.getAnimations()) {
      anim.pause();
      anim.currentTime = 0;
    }
    // El caret de los inputs parpadea y ensucia el diff.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
}

async function main() {
  const label = process.argv[2];
  const record = process.argv.includes('--record');
  if (!label) throw new Error('Falta el label: node capture.js <before|after> [--record]');

  const outDir = path.resolve(__dirname, 'snapshots', label);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const { server, origin } = await start();

  const browser = await chromium.launch();
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      locale: 'es-AR',
      timezoneId: 'America/Argentina/Buenos_Aires',
      reducedMotion: 'no-preference',
      storageState: { cookies: [], origins: [] },
    });
    // Fecha fija: calendario.js marca el día de hoy con la clase `today`, así
    // que sin esto una captura tomada otro día difiere sin que cambie el CSS.
    await context.clock.setFixedTime(new Date(FIXED_DATE));

    await netcache.attach(context, { record });

    // auth.js redirige al SSO cuando no hay sesión, y ese redirect se salta
    // con un flag en sessionStorage. Lo pre-sembramos para que las páginas
    // rendericen en su sitio en vez de navegar a FSCAuth.
    await context.addInitScript(() => {
      try { sessionStorage.setItem('fsc_sso_checked', 'true'); } catch {}
    });

    for (const p of PAGES) {
      let page, errors;
      // Algunas páginas fallan la navegación de forma intermitente; sin el
      // reintento ese ruido se confunde con una diferencia visual real.
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (page) await page.close();
        page = await context.newPage();
        errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        try {
          // 'load' y no 'networkidle': Socket.io mantiene una conexión abierta
          // y la red nunca queda inactiva.
          await page.goto(`${origin}${p.url}`, { waitUntil: 'load', timeout: 45000 });
          break;
        } catch (e) {
          if (attempt === 3) errors.push(`goto: ${e.message}`);
        }
      }

      await page.evaluate(() => document.fonts.ready).catch(() => {});
      // Esperamos a que el DOM deje de mutar en vez de usar un timeout fijo:
      // el render que disparan las respuestas de la API y los rAF encadenados
      // tarda distinto en cada corrida y un timeout fijo deja carreras vivas.
      await waitForQuiescence(page);
      await freeze(page).catch(() => {});

      const file = path.join(outDir, `${p.name}--${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });

      const size = await page.evaluate(() => ({
        w: document.documentElement.scrollWidth,
        h: document.documentElement.scrollHeight,
      }));
      results.push({ page: p.name, viewport: vp.name, ...size, errors });
      process.stdout.write(`  ${p.name} @ ${vp.name} ${size.w}x${size.h}${errors.length ? ` [${errors.length} err]` : ''}\n`);

      await page.close();
    }
    await context.close();
  }

  await browser.close();
  server.close();

  fs.writeFileSync(path.join(outDir, '_meta.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.length} snapshots -> snapshots/${label}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
