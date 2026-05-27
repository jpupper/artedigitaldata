/**
 * ADDBOT Init - Crea el usuario ADDBOT en la base de datos
 * de Arte Digital Data.
 * 
 * Ejecutar en el VPS:
 *   cd /root/artedigitaldata && node dist/scripts/addbot-init.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';

async function init() {
  console.log('=== ADDBOT Init ===');
  console.log('Conectando a MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));
  
  await mongoose.connect(MONGODB_URI);
  console.log('[OK] Conectado a MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  // Check if already exists
  const existing = await User.findOne({ username: 'ADDBOT' });
  if (existing) {
    console.log('[OK] El usuario ADDBOT ya existe:');
    console.log(`  ID: ${existing._id}`);
    console.log(`  Rol: ${existing.permissions?.artedigital?.role || 'USUARIO'}`);
    
    // Asegurar que sea admin
    if (existing.permissions?.artedigital?.role !== 'ADMINISTRADOR') {
      await User.updateOne(
        { _id: existing._id },
        { $set: { 'permissions.artedigital.role': 'ADMINISTRADOR', role: 'SYSTEM' } }
      );
      console.log('[OK] Actualizado a ADMINISTRADOR');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  }

  // Create user
  const password = 'ADDBOT_' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  const botUser = await User.create({
    username: 'ADDBOT',
    email: 'addbot@artedigitaldata.com',
    password: hashedPassword,
    displayName: '🤖 ADDBOT',
    role: 'SYSTEM',
    permissions: {
      artedigital: {
        role: 'ADMINISTRADOR'
      }
    },
    avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712038.png',
    bio: '🤖 Bot automático de Arte Digital Data. Scrapea y publica contenido de arte digital, AI y creative coding automáticamente.',
    socials: {},
    createdAt: new Date()
  });

  console.log('[OK] Usuario ADDBOT creado exitosamente:');
  console.log(`  ID: ${botUser._id}`);
  console.log(`  Username: ADDBOT`);
  console.log(`  Password: ${password}`);
  console.log(`  Rol: ADMINISTRADOR`);
  console.log('');
  console.log('IMPORTANTE: Guarda la contraseña mostrada arriba.');
  console.log('Luego inicia sesion como ADDBOT en artedigitaldata.com');
  console.log('y copia el token JWT del localStorage para configurar ADDBOT_TOKEN en .env');
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

init().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
