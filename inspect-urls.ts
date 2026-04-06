import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';
const MONGODB_AUTH_URI = process.env.MONGODB_AUTH_URI || 'mongodb://localhost:27017/fullscreen_global';

async function check() {
    try {
        console.log('Connecting to Project DB...');
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        console.log('Connected.');
        
        const Post = conn.model('Post', new mongoose.Schema({ imageUrl: String, title: String }));
        const posts = await Post.find({ imageUrl: /./ }).limit(10);
        console.log(`Found ${posts.length} posts with imageUrl.`);
        posts.forEach(p => {
           console.log(`- Title: ${p.get('title')} | URL: ${p.get('imageUrl')}`);
        });

        console.log('\nConnecting to Global Auth DB...');
        const connAuth = await mongoose.createConnection(MONGODB_AUTH_URI).asPromise();
        console.log('Connected.');
        
        const User = connAuth.model('User', new mongoose.Schema({ avatar: String, username: String }));
        const users = await User.find({ avatar: /./ }).limit(10);
        console.log(`Found ${users.length} users with avatar.`);
        users.forEach(u => {
           console.log(`- User: ${u.get('username')} | Avatar: ${u.get('avatar')}`);
        });

        await conn.close();
        await connAuth.close();
    } catch (e) {
        console.error('Error during check:', e);
    }
}

check();
