import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/artedigital';
const MONGODB_AUTH_URI = process.env.MONGODB_AUTH_URI || 'mongodb://127.0.0.1:27017/fullscreen_global';

async function scan() {
    try {
        const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
        console.log('--- Project DB: artedigital ---');
        const collections = await conn.db.listCollections().toArray();
        for (const colInfo of collections) {
            const docsWithCloudinary = await conn.db.collection(colInfo.name).find({
                $or: Object.keys((await conn.db.collection(colInfo.name).findOne()) || {}).map(key => ({ [key]: /cloudinary/ }))
            }).limit(5).toArray();
            if (docsWithCloudinary.length > 0) {
                console.log(`Collection [${colInfo.name}] has ${docsWithCloudinary.length} samples with Cloudinary URLs.`);
                docsWithCloudinary.forEach(d => {
                   console.log(` - Record:`, JSON.stringify(d, null, 2));
                });
            }
        }
        await conn.close();

        const connAuth = await mongoose.createConnection(MONGODB_AUTH_URI).asPromise();
        console.log('--- Auth DB: fullscreen_global ---');
        const usersWithCloudinary = await connAuth.db.collection('users').find({
            $or: [{ avatar: /cloudinary/ }, { profile: /cloudinary/ }]
        }).limit(5).toArray();
        if (usersWithCloudinary.length > 0) {
            console.log(`Users has ${usersWithCloudinary.length} samples with Cloudinary.`);
            usersWithCloudinary.forEach(u => console.log(' - User:', u.username, '| Avatar:', u.avatar));
        }
        await connAuth.close();
    } catch (e) {
        console.error('Error during scan:', e);
    }
}
scan();
