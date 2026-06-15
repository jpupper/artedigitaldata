import jwt from 'jsonwebtoken';
import fs from 'fs';
import sharp from 'sharp';

const env = fs.readFileSync('/root/fscauth/.env', 'utf8');
const match = env.match(/JWT_SECRET=(.+)/);
const secret = match ? match[1].trim() : '';

// Token for admin user
const token = jwt.sign(
  { id: '69c02530b2cc8407a1eb07f1', email: 'julian.d.puppo@gmail.com', role: 'ADMIN' },
  secret,
  { expiresIn: '1h' }
);

fs.writeFileSync('/tmp/admin_token.txt', token);
console.log('TOKEN:' + token.substring(0, 30) + '...');
