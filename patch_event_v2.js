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
  // Login
  const loginResult = await request('POST', 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api/auth/login', {
    identifier: 'jpupper',
    password: 'ayp0624'
  });
  if (!loginResult.token) {
    console.error('Login failed:', JSON.stringify(loginResult));
    process.exit(1);
  }
  const token = loginResult.token;
  console.error('Logged in. Token length:', token.length);

  // PATCH event with tags
  const tags = ["Videojuegos", "Instalaciones interactivas", "Programación gráfica", "VJing",
    "Instalaciones multimediales", "Inteligencia Artificial", "Tecnología", "Arte",
    "Código", "Livecoding", "Shaders", "Visuales", "DJs", "VJs"];
  
  const result = await request('PATCH', 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api/eventos/6a440f4e2302a02f89463721', { tags: tags }, token);
  
  if (result.error) {
    console.error('Error:', result.error);
    process.exit(1);
  }
  console.log('TAGS:', JSON.stringify(result.tags));
  console.log('TICKET price:', result.ticketConfig?.price);
  console.log('TICKET isContribution:', result.ticketConfig?.isContribution);
  console.log('Participants:', result.participants?.length);
}

main().catch(e => console.error('Error:', e.message));
