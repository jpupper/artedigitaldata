const https = require('https');

function request(method, url, data, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { resolve({ error: body.substring(0, 300) }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  const loginResult = await request('POST', 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api/auth/login', {
    identifier: 'jpupper',
    password: 'ayp0624'
  });
  const token = loginResult.token;
  console.error('Token length:', token.length);

  // Get the event to check
  const ev = await request('GET', 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api/eventos/6a440f4e2302a02f89463721', null, token);
  
  console.log('tags:', JSON.stringify(ev.tags));
  console.log('price:', ev.ticketConfig?.price);
  console.log('isContribution:', ev.ticketConfig?.isContribution);
  console.log('participants count:', ev.participants?.length);
}

main().catch(e => console.error('Error:', e.message));
