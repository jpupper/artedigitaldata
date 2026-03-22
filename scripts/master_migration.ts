import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import crypto from 'crypto';

const ARTEDIGITAL_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';
const GLOBAL_URI = process.env.MONGODB_AUTH_URI || 'mongodb://localhost:27017/fullscreen_global';

async function grandMigration() {
  try {
    console.log('\n--- 🚀 INICIANDO GRAN MIGRACIÓN Y REPARACIÓN PROFUNDA ---');
    console.log(`[CONN] Arte Digital: ${ARTEDIGITAL_URI.split('@').pop()}`);
    console.log(`[CONN] Global Auth: ${GLOBAL_URI.split('@').pop()}`);

    const artConn = await mongoose.createConnection(ARTEDIGITAL_URI).asPromise();
    const globalConn = await mongoose.createConnection(GLOBAL_URI).asPromise();

    console.log('[OK] Conexiones activas.');

    const OldUser = artConn.model('OldUser', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const GlobalUser = globalConn.model('User', new mongoose.Schema({
        username: { type: String, required: true },
        email: { type: String, required: true },
        hexId: { type: String, unique: true },
        permissions: Object,
        role: String
    }, { strict: false, collection: 'users' }));

    const Post = artConn.model('Post', new mongoose.Schema({}, { strict: false, collection: 'posts' }));
    const Recurso = artConn.model('Recurso', new mongoose.Schema({}, { strict: false, collection: 'recursos' }));
    const Evento = artConn.model('Evento', new mongoose.Schema({}, { strict: false, collection: 'eventos' }));
    const Message = artConn.model('Message', new mongoose.Schema({}, { strict: false, collection: 'messages' }));

    // 1. MAPEADO DE USUARIOS
    console.log('\n--- Fase 1: Sincronización de Usuarios ---');
    const oldUsers = await OldUser.find({});
    console.log(`[INFO] Encontrados ${oldUsers.length} usuarios en Arte Digital Local.`);

    const idMapping: Map<string, string> = new Map();

    for (const u of oldUsers as any) {
        let email = u.get('email') ? u.get('email').toLowerCase() : null;
        const username = u.get('username') || u.get('displayName') || 'Usuario_' + u._id.toString().substring(18);

        if (!email) {
            email = (username.replace(/\s+/g, '') + u._id.toString().substring(18) + '@artedigital.temp').toLowerCase();
            console.warn(`[WARN] Usuario ${username} no tiene email. Generando temporal: ${email}`);
        }

        let globalU = await GlobalUser.findOne({ email });

        if (!globalU) {
            console.log(`[CREATE] Migrando: ${username} (${email})`);
            const hexId = crypto.randomBytes(4).toString('hex').toUpperCase();

            const result = await globalConn.db!.collection('users').insertOne({
                username: username,
                email: email,
                password: u.get('password') || '$2a$10$temporaryhashedpasswordplaceholder',
                displayName: u.get('displayName') || username,
                avatar: u.get('avatar') || '',
                bio: u.get('bio') || '',
                role: (u.get('role') === 'ADMIN' || u.get('role') === 'ADMINISTRADOR') ? 'ADMIN' : 'USER',
                origin: 'artedigitaldata',
                hexId: hexId,
                permissions: {
                    artedigital: { role: (u.get('role') === 'ADMIN' || u.get('role') === 'ADMINISTRADOR') ? 'ADMINISTRADOR' : 'USUARIO' },
                    pizarraia: { canCreateSessions: false, canAccessAdmin: false },
                    jpshader: { canUpload: true, isAdmin: false }
                },
                createdAt: u.get('createdAt') || new Date(),
                updatedAt: u.get('updatedAt') || new Date()
            });
            idMapping.set(u._id.toString(), result.insertedId.toString());
        } else {
            console.log(`[MATCH] Ya existe: ${email} -> ID Global: ${globalU._id}`);
            idMapping.set(u._id.toString(), globalU._id.toString());
            
            // Sincronizar permisos si faltan
            if (!globalU.get('permissions')?.artedigital) {
                await GlobalUser.updateOne({ _id: globalU._id }, {
                    $set: { 'permissions.artedigital': { role: (u.get('role') === 'ADMIN' || u.get('role') === 'ADMINISTRADOR') ? 'ADMINISTRADOR' : 'USUARIO' } }
                });
            }
        }
    }

    // 2. RE-VINCULACIÓN DE CONTENIDO
    console.log('\n--- Fase 2: Re-vinculación de Contenido ---');

    const collections = [
        { model: Post, authorField: 'author', name: 'Posts' },
        { model: Recurso, authorField: 'author', name: 'Recursos' },
        { model: Evento, authorField: 'creator', name: 'Eventos' }
    ];

    for (const coll of collections) {
        const items = await coll.model.find({});
        console.log(`[INFO] Sincronizando ${items.length} ${coll.name}...`);
        
        let updateCount = 0;
        for (const item of items as any) {
            const oldId = item[coll.authorField] ? item[coll.authorField].toString() : null;
            const newId = idMapping.get(oldId);

            const updates: any = {};
            let changed = false;

            if (newId && oldId !== newId) {
                updates[coll.authorField] = new mongoose.Types.ObjectId(newId);
                changed = true;
            }

            // Likes
            if (item.likes && Array.isArray(item.likes)) {
                const newLikes = item.likes.map((l: any) => {
                    const mapped = idMapping.get(l.toString());
                    return mapped ? new mongoose.Types.ObjectId(mapped) : l;
                });
                if (JSON.stringify(newLikes) !== JSON.stringify(item.likes)) {
                    updates.likes = newLikes;
                    changed = true;
                }
            }

            // Comments
            if (item.comments && Array.isArray(item.comments)) {
                const newComments = item.comments.map((c: any) => {
                    const mapped = idMapping.get(c.user ? c.user.toString() : '');
                    return mapped ? { ...c, user: new mongoose.Types.ObjectId(mapped) } : c;
                });
                updates.comments = newComments;
                changed = true;
            }

            if (changed) {
                await coll.model.updateOne({ _id: item._id }, { $set: updates });
                updateCount++;
            }
        }
        console.log(`[OK] ${coll.name} actualizados: ${updateCount}`);
    }

    // 4. LIMPIEZA / VERIFICACIÓN
    console.log('\n--- Finalizando ---');
    console.log(`[RESUMEN] Total usuarios mapeados: ${idMapping.size}`);
    console.log('--- 🏁 GRAN MIGRACIÓN COMPLETADA ---');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR FATAL:', err);
    process.exit(1);
  }
}

grandMigration();
