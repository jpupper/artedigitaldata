import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = 'mongodb://127.0.0.1:27017/artedigital';

async function checkMore() {
    try {
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        const collections = ['posts', 'recursos', 'eventos', 'users', 'messages'];
        
        for (const col of collections) {
            const count = await conn.db.collection(col).countDocuments();
            console.log(`- Collection [${col}]: ${count} docs`);
            const all = await conn.db.collection(col).find().toArray();
            for (const doc of all) {
                const s = JSON.stringify(doc);
                if (s.includes('http')) {
                    console.log(`  [LINK] ${col} ID: ${doc._id} -> ${s.substring(0, 50)}...`);
                }
            }
        }
        await conn.close();
    } catch (e) {
        console.error(e);
    }
}
checkMore();
