import urllib.request, json, datetime

data = json.loads(urllib.request.urlopen("http://localhost:2495/artedigitaldata/api/posts").read())
cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)
recent = []
for p in data:
    c = p.get("createdAt","")
    if c:
        dt = datetime.datetime.fromisoformat(c.replace("Z","+00:00"))
        if dt > cutoff:
            img = p.get("imageUrl","") or ""
            recent.append({"t":(p.get("title","") or "")[:30],"img":bool(img),"u":img[:60],"c":c[:19]})
print("Posts in last 2h:", len(recent))
for r in recent:
    print(f"  {r['c']} | img={r['img']} | {r['t']} | url={r['u']}")
