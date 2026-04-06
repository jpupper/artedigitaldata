import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';

async function listCollections() {
    try {
        console.log('Connecting to Project DB...');
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        console.log('Connected.');
        
        const collections = await conn.db.listCollections().toArray();
        console.log('Collections in artedigital:');
        collections.forEach(c => console.log(' - ', c.name));
        
        for (const coll of collections) {
           const count = await conn.db.collection(coll.name).countDocuments();
           console.log(` - ${coll.name}: ${count} documents`);
        }

        await conn.close();
    } catch (e) {
        console.error('Error:', e);
    }
}

listCollections();
