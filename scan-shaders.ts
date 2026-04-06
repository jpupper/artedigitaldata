import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = 'mongodb://127.0.0.1:27017/shadersDB';

async function scan() {
    try {
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        console.log('--- DB: shadersDB ---');
        const collections = await conn.db.listCollections().toArray();
        for (const col of collections) {
            const count = await conn.db.collection(col.name).countDocuments();
            console.log(`- Collection ${col.name}: ${count} docs`);
            
            const samples = await conn.db.collection(col.name).find({
                $or: [
                    { imageUrl: /cloudinary\.com/ },
                    { thumb: /cloudinary\.com/ },
                    { preview: /cloudinary\.com/ }
                ]
            }).limit(5).toArray();
            
            if (samples.length > 0) {
              console.log(`  !! Found Cloudinary links in [${col.name}]`);
            }
        }
        await conn.close();
    } catch (e) {
        console.error(e);
    }
}
scan();
