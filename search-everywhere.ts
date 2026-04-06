import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const FILE_SIGNATURES = ['ams6jvpsplypmwz1ctiq', 'ccsq7otpoeosr0mjhubj', 'eekxuxeqr1t6jlb5cw0o'];

async function searchEverywhere() {
    try {
        const adminConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/admin').asPromise();
        const dbs = await adminConn.db.admin().listDatabases();
        
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;
            
            console.log(`Scanning database: ${dbName}...`);
            const conn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${dbName}`).asPromise();
            const collections = await conn.db.listCollections().toArray();
            
            for (const col of collections) {
                for (const sig of FILE_SIGNATURES) {
                    const count = await conn.db.collection(col.name).countDocuments({
                        $or: [
                            { imageUrl: { $regex: sig } },
                            { avatar: { $regex: sig } },
                            { image: { $regex: sig } },
                            { photo: { $regex: sig } },
                            { archivoUrl: { $regex: sig } },
                            { content: { $regex: sig } }
                        ]
                    });
                    if (count > 0) {
                        console.log(`  !! FOUND ${count} matches for [${sig}] in DB [${dbName}] Collection [${col.name}]`);
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
searchEverywhere();
