#!/usr/bin/env node
/**
 * Cron runner para el Autobot de Arte Digital Data
 * 
 * Este script llama al endpoint admin del autobot desde un cron externo.
 * 
 * Uso en crontab (ejecutar 1 vez al día a las 8am):
 *   0 8 * * * cd /path/to/artedigitaldata && node dist/scripts/cron-runner.js
 * 
 * O usando PM2:
 *   pm2 start dist/scripts/cron-runner.js --name autobot --cron-restart="0 8 * * *" --no-autorestart
 * 
 * También se puede agregar como script de node-cron dentro del server.ts.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const API_BASE = process.env.API_BASE || 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api';
const CRON_TOKEN = process.env.CRON_TOKEN || '';

async function run() {
  console.log(`[Cron-Runner] Ejecutando autobot via API...`);
  console.log(`[Cron-Runner] API: ${API_BASE}/admin/autobot/run`);

  if (!CRON_TOKEN) {
    console.error('[Cron-Runner] ❌ CRON_TOKEN no configurado en .env');
    console.error('[Cron-Runner] Generalo con:');
    console.error('  - Iniciá sesión como admin en la web');
    console.error('  - Copiá tu token JWT del localStorage (artedigitaldata_token)');
    console.error('  - Pegalo como CRON_TOKEN en el .env');
    process.exit(1);
  }

  try {
    const res = await fetch(`${API_BASE}/admin/autobot/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Cron-Runner] ❌ Error: ${res.status} ${err}`);
      process.exit(1);
    }

    const data: any = await res.json();
    console.log(`[Cron-Runner] ✅ Autobot ejecutado:`);
    console.log(`  Publicados: ${data.published}/${data.found}`);
    if (data.errors?.length) {
      console.log(`  Errores: ${data.errors.length}`);
      data.errors.forEach((e: string) => console.log(`    ✗ ${e}`));
    }
  } catch (err) {
    console.error(`[Cron-Runner] ❌ Error de conexión:`, (err as Error).message);
    process.exit(1);
  }

  process.exit(0);
}

run();
