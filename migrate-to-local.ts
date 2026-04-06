import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/artedigital';
const MONGODB_AUTH_URI = process.env.MONGODB_AUTH_URI || 'mongodb://127.0.0.1:27017/fullscreen_global';

// Path logic for URLs
const LOCAL_URL_PREFIX = '/artedigitaldata/img/backupcloudinary/';

async function migrate() {
    try {
        console.log('Connecting to Project DB...');
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        console.log('Connected to artedigital.');

        // Simple Schema with strict: false to access any existing field
        const Post = conn.model('Post', new mongoose.Schema({}, { strict: false }));
        const Recurso = conn.model('Recurso', new mongoose.Schema({}, { strict: false }));
        const Evento = conn.model('Evento', new mongoose.Schema({}, { strict: false }));

        let updatedPosts = 0;
        let updatedRecursos = 0;
        let updatedEventos = 0;

        // Migrate Posts
        const posts = await Post.find({ imageUrl: { $exists: true, $ne: null, $regex: /cloudinary\.com/ } });
        for (const post of posts) {
            const oldUrl = post.get('imageUrl') as string;
            if (oldUrl) {
                const filename = oldUrl.split('/').pop();
                if (filename) {
                    const newUrl = `${LOCAL_URL_PREFIX}${filename}`;
                    await Post.updateOne({ _id: post._id }, { $set: { imageUrl: newUrl } });
                    updatedPosts++;
                    console.log(`[Post] Updated: ${post._id} -> ${newUrl}`);
                }
            }
        }

        // Migrate Recursos
        const recursos = await Recurso.find({
            $or: [
                { imageUrl: { $exists: true, $ne: null, $regex: /cloudinary\.com/ } },
                { archivoUrl: { $exists: true, $ne: null, $regex: /cloudinary\.com/ } }
            ]
        });
        for (const rec of recursos) {
            let update: any = {};
            const imgUrl = rec.get('imageUrl') as string;
            if (imgUrl && imgUrl.includes('cloudinary.com')) {
                const filename = imgUrl.split('/').pop();
                if (filename) update.imageUrl = `${LOCAL_URL_PREFIX}${filename}`;
            }
            const arcUrl = rec.get('archivoUrl') as string;
            if (arcUrl && arcUrl.includes('cloudinary.com')) {
                const filename = arcUrl.split('/').pop();
                if (filename) update.archivoUrl = `${LOCAL_URL_PREFIX}${filename}`;
            }
            if (Object.keys(update).length > 0) {
                await Recurso.updateOne({ _id: rec._id }, { $set: update });
                updatedRecursos++;
                console.log(`[Recurso] Updated: ${rec._id}`);
            }
        }

        // Migrate Eventos
        const eventos = await Evento.find({ imageUrl: { $exists: true, $ne: null, $regex: /cloudinary\.com/ } });
        for (const ev of eventos) {
            const oldUrl = ev.get('imageUrl') as string;
            if (oldUrl) {
                const filename = oldUrl.split('/').pop();
                if (filename) {
                    const newUrl = `${LOCAL_URL_PREFIX}${filename}`;
                    await Evento.updateOne({ _id: ev._id }, { $set: { imageUrl: newUrl } });
                    updatedEventos++;
                    console.log(`[Evento] Updated: ${ev._id} -> ${newUrl}`);
                }
            }
        }

        console.log(`Summary Project DB:`);
        console.log(`- Updated Posts: ${updatedPosts}`);
        console.log(`- Updated Recursos: ${updatedRecursos}`);
        console.log(`- Updated Eventos: ${updatedEventos}`);

        await conn.close();

        console.log('\nConnecting to Auth DB...');
        const connAuth = await mongoose.createConnection(MONGODB_AUTH_URI).asPromise();
        console.log('Connected to fullscreen_global.');

        const User = connAuth.model('User', new mongoose.Schema({}, { strict: false }));
        let updatedUsers = 0;

        const users = await User.find({ avatar: { $exists: true, $ne: null, $regex: /cloudinary\.com/ } });
        for (const user of users) {
          const oldAvatar = user.get('avatar') as string;
          if (oldAvatar) {
              const filename = oldAvatar.split('/').pop();
              if (filename) {
                  const newAvatar = `${LOCAL_URL_PREFIX}${filename}`;
                  await User.updateOne({ _id: user._id }, { $set: { avatar: newAvatar } });
                  updatedUsers++;
                  console.log(`[User] Updated: ${user._id} -> ${newAvatar}`);
              }
          }
        }

        console.log(`Summary Auth DB:`);
        console.log(`- Updated Users: ${updatedUsers}`);

        await connAuth.close();
        console.log('\nMigration finished successfully.');

    } catch (err) {
        console.error('Error during migration:', err);
    }
}

migrate();
