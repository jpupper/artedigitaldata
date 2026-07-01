import json, urllib.request, urllib.error, sys

# Login
login_url = "https://vps-4455523-x.dattaweb.com/artedigitaldata/api/auth/login"
login_data = json.dumps({"identifier": "jpupper", "password": "ayp0624"}).encode('utf-8')
login_req = urllib.request.Request(login_url, data=login_data, method='POST')
login_req.add_header('Content-Type', 'application/json')
login_resp = urllib.request.urlopen(login_req)
login_result = json.loads(login_resp.read().decode())
TOKEN = login_result['token']
print(f"Logged in. Token: {TOKEN[:20]}...", file=sys.stderr)

# PATCH event
url = "https://vps-4455523-x.dattaweb.com/artedigitaldata/api/eventos/6a440f4e2302a02f89463721"
tags_list = ["Videojuegos", "Instalaciones interactivas", "Programación gráfica", "VJing",
             "Instalaciones multimediales", "Inteligencia Artificial", "Tecnología", "Arte",
             "Código", "Livecoding", "Shaders", "Visuales", "DJs", "VJs"]
payload = json.dumps({"tags": tags_list}).encode('utf-8')
req = urllib.request.Request(url, data=payload, method='PATCH')
req.add_header('Content-Type', 'application/json')
req.add_header('Authorization', f'Bearer {TOKEN}')

try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read().decode())
    print(f"SUCCESS: Tags = {json.dumps(result.get('tags'))}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()[:300]}")
