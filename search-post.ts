import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/artedigital';

async function search() {
    try {
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        console.log('Connected.');
        
        const posts = await conn.db.collection('posts').find({ 
           $or: [
              { imageUrl: /hleysycrydxas2nqb9bc/ },
              { imageUrl: /cloudinary/ }
           ]
        }).toArray();
        
        console.log(`Found ${posts.length} matching posts.`);
        posts.forEach(p => console.log(' - Post:', p.title, '| URL:', p.imageUrl));
        
        await conn.close();
    } catch (e) {
        console.error('Error:', e);
    }
}
search();
