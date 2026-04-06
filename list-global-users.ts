import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_AUTH_URI = process.env.MONGODB_AUTH_URI || 'mongodb://127.0.0.1:27017/fullscreen_global';

async function listUsers() {
    try {
        console.log(`Connecting to: ${MONGODB_AUTH_URI}`);
        const connAuth = await mongoose.createConnection(MONGODB_AUTH_URI).asPromise();
        console.log('Connected.');
        
        const User = connAuth.model('User', new mongoose.Schema({ username: String, avatar: String }));
        const users = await User.find();
        console.log(`Found ${users.length} users in GLOBAL DB.`);
        users.forEach(u => {
           console.log(`- ${u.get('username')}: ${u.get('avatar') || 'NO AVATAR'}`);
        });

        await connAuth.close();
    } catch (e) {
        console.error('Error:', e);
    }
}
listUsers();
