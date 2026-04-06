import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/artedigital';

async function listDbs() {
    try {
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        const dbs = await conn.db.admin().listDatabases();
        console.log('Databases available:');
        dbs.databases.forEach(db => console.log(' - ', db.name));
        await conn.close();
    } catch (e) {
        console.error('Error:', e);
    }
}
listDbs();
