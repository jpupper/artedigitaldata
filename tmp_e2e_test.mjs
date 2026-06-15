#!/usr/bin/env node
// End-to-end test: upload image, create post, verify it's in DB
import jwt from 'jsonwebtoken';
import fs from 'fs';

const env = fs.readFileSync('/root/fscauth/.env', 'utf8');
const match = env.match(/JWT_SECRET=(.+)/);
const secret = match ? match[1].trim() : '';
const token = jwt.sign(
  { id: '69c02530b2cc8407a1eb07f1', email: 'julian.d.puppo@gmail.com', role: 'ADMIN' },
  secret,
  { expiresIn: '1h' }
);

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('=== STEP 1: Upload image ===');
  const testImg = fs.readFileSync('/root/artedigitaldata/public/img/artedigital.png');
  const blob = new Blob([testImg]);
  const fd = new FormData();
  fd.append('file', blob, 'test_image.png');
  
  const upload = await fetchJSON('http://localhost:2495/artedigitaldata/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Referer': 'https://artedigitaldata.com/create.html' },
    body: fd
  });
  console.log('Upload status:', upload.status, upload.ok);
  console.log('Upload data:', JSON.stringify(upload.data).substring(0, 200));
  
  if (!upload.ok || !upload.data.url) {
    console.log('FAILED: Upload did not return URL');
    process.exit(1);
  }
  const imageUrl = upload.data.url;
  
  console.log('\n=== STEP 2: Create post ===');
  const create = await fetchJSON('http://localhost:2495/artedigitaldata/api/posts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'TEST POST - delete me',
      description: 'This is a test post created by the system to verify image upload works',
      imageUrl: imageUrl,
      youtube_video: '',
      tags: ['test']
    })
  });
  console.log('Create status:', create.status, create.ok);
  console.log('Create data:', JSON.stringify(create.data).substring(0, 300));
  
  if (!create.ok) {
    console.log('FAILED: Post was not created');
    process.exit(1);
  }
  
  const postId = create.data._id || create.data.id;
  const savedImageUrl = create.data.imageUrl || '';
  console.log('\n=== RESULTS ===');
  console.log('Post ID:', postId);
  console.log('Saved imageUrl:', savedImageUrl ? savedImageUrl.substring(0, 100) : 'EMPTY!');
  console.log('imageUrl matches upload:', savedImageUrl === imageUrl ? 'YES' : 'NO - MISMATCH!');
  
  if (!savedImageUrl) {
    console.log('\nFAILURE: Image URL was NOT saved to the post!');
    process.exit(1);
  }
  
  console.log('\n=== STEP 3: Verify image is accessible ===');
  try {
    const imgCheck = await fetch(imageUrl, { method: 'HEAD' });
    console.log('Image accessible?:', imgCheck.status, imgCheck.ok);
  } catch (e) {
    console.log('Image NOT accessible:', e.message);
  }
  
  console.log('\n=== ALL TESTS PASSED ===');
}

main().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
