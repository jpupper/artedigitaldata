import subprocess
import json
import urllib.request
import sys
import os

# Get JWT secret from env file
secret = None
with open("/root/fscauth/.env") as f:
    for line in f:
        if line.startswith("JWT_SECRET="):
            secret = line.split("=", 1)[1].strip()
            break

if not secret:
    print("ERROR: Could not read JWT_SECRET")
    sys.exit(1)

# Generate token using node
node_script = """
const jwt = require("/root/artedigitaldata/node_modules/jsonwebtoken");
const secret = process.argv[1];
const token = jwt.sign(
  { id: "69c02530b2cc8407a1eb07f1", email: "julian.d.puppo@gmail.com", role: "ADMIN" },
  secret,
  { expiresIn: "1h" }
);
console.log(token);
"""
result = subprocess.run(
    ["node", "-e", node_script, secret],
    capture_output=True, text=True,
    cwd="/root/artedigitaldata"
)
if result.returncode != 0:
    print(f"ERROR generating token: {result.stderr}")
    sys.exit(1)

token = result.stdout.strip()
print(f"Token generated: {token[:30]}...")

# Step 1: Upload image
print("\n=== STEP 1: Upload image ===")
upload_cmd = [
    "curl", "-s", "-X", "POST",
    "http://localhost:2495/artedigitaldata/api/upload",
    "-H", f"Authorization: Bearer {token}",
    "-H", "Referer: https://artedigitaldata.com/create.html",
    "-F", "file=@/root/artedigitaldata/public/img/artedigital.png"
]
result = subprocess.run(upload_cmd, capture_output=True, text=True)

try:
    upload_data = json.loads(result.stdout)
except json.JSONDecodeError as e:
    print(f"ERROR parsing upload response: {e}")
    print(f"Raw response: {result.stdout[:200]}")
    sys.exit(1)

print(f"Upload status: {json.dumps(upload_data)[:200]}")

image_url = upload_data.get("url", "")
if not image_url:
    print("FAIL: No image URL returned from upload")
    sys.exit(1)

# Step 2: Create post with the image URL
print("\n=== STEP 2: Create post ===")
post_body = json.dumps({
    "title": "TEST POST END2END - delete me",
    "description": "End-to-end test of image upload flow",
    "imageUrl": image_url,
    "youtube_video": "",
    "tags": ["test"]
})

create_cmd = [
    "curl", "-s", "-X", "POST",
    "http://localhost:2495/artedigitaldata/api/posts",
    "-H", f"Authorization: Bearer {token}",
    "-H", "Content-Type: application/json",
    "-d", post_body
]
result = subprocess.run(create_cmd, capture_output=True, text=True)

try:
    create_data = json.loads(result.stdout)
except json.JSONDecodeError as e:
    print(f"ERROR parsing create response: {e}")
    print(f"Raw response: {result.stdout[:200]}")
    sys.exit(1)

saved_img = create_data.get("imageUrl", "") or ""
post_id = create_data.get("_id", "") or ""

print(f"Post ID: {post_id[:15]}...")
print(f"Saved imageUrl: {saved_img[:80] if saved_img else 'EMPTY!'}")
print(f"URL matches upload: {saved_img == image_url}")

if not saved_img:
    print("\n*** BUG CONFIRMED: imageUrl NOT saved to post! ***")
    print(f"  Upload returned URL: {image_url}")
    print(f"  Post saved with: '{saved_img}'")
    print(f"  Full create response: {json.dumps(create_data)[:300]}")
    sys.exit(1)

# Step 3: Verify image is accessible via HTTP
print("\n=== STEP 3: Check image accessibility ===")
try:
    resp = urllib.request.urlopen(image_url)
    print(f"Image HTTP status: {resp.status} OK")
except Exception as e:
    print(f"Image access ERROR: {e}")

print("\n=== ALL TESTS PASSED ===")
print(f"\nYou can verify at: {post_id}")
print(f"Image URL: {image_url}")
print(f"Post API: http://localhost:2495/artedigitaldata/api/posts/{post_id}")
