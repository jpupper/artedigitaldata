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

console.log(token);
