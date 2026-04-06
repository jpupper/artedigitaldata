import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = 'mongodb://127.0.0.1:27017/artedigital';
const MONGODB_AUTH_URI = 'mongodb://127.0.0.1:27017/fullscreen_global';

async function listAll() {
    try {
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        const Post = conn.model('Post', new mongoose.Schema({}, { strict: false }));
        const posts = await Post.find();
        console.log(`Total Posts in artedigital: ${posts.length}`);
        posts.forEach(p => console.log(`- PostID: ${p._id} | imageUrl: ${p.get('imageUrl')}`));
        await conn.close();

        const connAuth = await mongoose.createConnection(MONGODB_AUTH_URI).asPromise();
        const User = connAuth.model('User', new mongoose.Schema({}, { strict: false }));
        const users = await User.find();
        console.log(`Total Users in fullscreen_global: ${users.length}`);
        users.forEach(u => console.log(`- UserID: ${u._id} | username: ${u.get('username')} | avatar: ${u.get('avatar')}`));
        await connAuth.close();
    } catch (e) {
        console.error(e);
    }
}
listAll();
