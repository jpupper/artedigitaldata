import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function findAnyCloudinary() {
    try {
        const adminConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/admin').asPromise();
        const dbs = await adminConn.db.admin().listDatabases();
        
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;
            
            const conn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${dbName}`).asPromise();
            const collections = await conn.db.listCollections().toArray();
            
            for (const col of collections) {
                const samples = await conn.db.collection(col.name).find({}).limit(500).toArray();
                for (const doc of samples) {
                    const str = JSON.stringify(doc);
                    if (str.includes('cloudinary.com')) {
                        console.log(`[FOUND] in DB [${dbName}] Col [${col.name}] ID [${doc._id}]`);
                        // Find specifically which key has it
                        for (const key in doc) {
                          if (typeof doc[key] === 'string' && doc[key].includes('cloudinary.com')) {
                             console.log(`  - Key [${key}]: ${doc[key]}`);
                          }
                        }
                    }
                }
            }
            await conn.close();
        }
        await adminConn.close();
    } catch (e) {
        console.error(e);
    }
}
findAnyCloudinary();
