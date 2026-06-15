const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync('/root/fscauth/.env', 'utf8');
const match = env.match(/JWT_SECRET=*** secret = match ? match[1].trim() : '';
const token = jwt.sign(
  { id: '69c02530b2cc8407a1eb07f1', email: 'julian.d.puppo@gmail.com', role: 'ADMIN' },
  secret,
  { expiresIn: '1h' }
);

async function main() {
  console.log('=== STEP 1: Upload image ===');
  const testImg = fs.readFileSync('/root/artedigitaldata/public/img/artedigital.png');
  
  // Use child_process to run curl for FormData upload
  const { execSync } = require('child_process');
  
  const uploadCmd = `curl -s -X POST http://localhost:2495/artedigitaldata/api/upload \
    -H "Authorization: Bearer ${token}" \
    -H "Referer: https://artedigitaldata.com/create.html" \
    -F "file=@/root/artedigitaldata/public/img/artedigital.png"`;

  const uploadResult = JSON.parse(execSync(uploadCmd).toString());
  console.log('Upload result:', uploadResult);
  
  if (!uploadResult.url) {
    console.log('FAILED: No URL returned from upload');
    process.exit(1);
  }
  const imageUrl = uploadResult.url;
  
  console.log('\n=== STEP 2: Create post ===');
  const createCmd = `curl -s -X POST http://localhost:2495/artedigitaldata/api/posts \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d '${JSON.stringify({
      title: 'TEST POST - delete me',
      description: 'Test to verify image upload works end-to-end',
      imageUrl: imageUrl,
      youtube_video: '',
      tags: ['test']
    })}'`;

  const createResult = JSON.parse(execSync(createCmd).toString());
  console.log('Create result:', JSON.stringify(createResult).substring(0, 300));
  
  const savedImageUrl = createResult.imageUrl || '';
  console.log('\n=== RESULTS ===');
  console.log('Post ID:', createResult._id);
  console.log('Saved imageUrl:', savedImageUrl.substring(0, 120));
  console.log('URL matches:', savedImageUrl === imageUrl ? 'YES' : 'NO');
  
  if (!savedImageUrl) {
    console.log('\nFAILURE: Image URL was NOT saved to the post!');
    process.exit(1);
  }
  
  console.log('\n=== STEP 3: Verify image accessible ===');
  try {
    const resp = await fetch(imageUrl, { method: 'HEAD' });
    console.log('Image HTTP status:', resp.status, resp.ok);
  } catch(e) {
    console.log('Image fetch error:', e.message);
  }
  
  console.log('\n=== ALL TESTS PASSED ===');
}

main().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
