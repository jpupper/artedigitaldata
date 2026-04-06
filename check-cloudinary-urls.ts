import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/artedigital';
const MONGODB_AUTH_URI = process.env.MONGODB_AUTH_URI || 'mongodb://127.0.0.1:27017/fullscreen_global';

async function scan() {
    try {
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        console.log('--- Project DB: artedigital ---');
        
        const Post = conn.model('Post', new mongoose.Schema({ imageUrl: String, title: String }, { strict: false }));
        let posts = await Post.find({ imageUrl: /cloudinary\.com/ });
        console.log(`Found ${posts.length} posts with cloudinary URLs.`);
        posts.slice(0, 5).forEach(p => console.log('Post imageUrl:', p.get('imageUrl')));
        
        const Recurso = conn.model('Recurso', new mongoose.Schema({ imageUrl: String, archivoUrl: String }, { strict: false }));
        let recursos = await Recurso.find({ $or: [{ imageUrl: /cloudinary\.com/ }, { archivoUrl: /cloudinary\.com/ }] });
        console.log(`Found ${recursos.length} recursos with cloudinary URLs.`);
        recursos.slice(0, 5).forEach(p => console.log('Recurso URLs:', p.get('imageUrl'), p.get('archivoUrl')));

        await conn.close();

        const connAuth = await mongoose.createConnection(MONGODB_AUTH_URI).asPromise();
        console.log('--- Auth DB: fullscreen_global ---');
        
        const User = connAuth.model('User', new mongoose.Schema({ avatar: String, username: String }, { strict: false }));
        let users = await User.find({ avatar: /cloudinary\.com/ });
        console.log(`Found ${users.length} users with cloudinary URLs.`);
        users.slice(0, 5).forEach(u => console.log('User avatar:', u.get('avatar')));

        await connAuth.close();
    } catch (e) {
        console.error('Error during scan:', e);
    }
}
scan();
