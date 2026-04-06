import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadDir = path.join(__dirname, 'public', 'img', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

async function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function fetchAndDownload() {
    let nextCursor: string | undefined = undefined;
    let count = 0;
    
    try {
        do {
            console.log('Fetching list of resources...');
            const result = await cloudinary.api.resources({
                type: 'upload',
                max_results: 500,
                next_cursor: nextCursor,
            });

            const resources = result.resources;
            console.log(`Found ${resources.length} resources in this batch.`);

            for (const res of resources) {
                try {
                    const url = res.secure_url;
                    const format = res.format || 'jpg';
                    const pubIdArr = res.public_id.split('/');
                    const filenameBase = pubIdArr[pubIdArr.length - 1];
                    const filename = `${filenameBase}.${format}`;
                    const dest = path.join(uploadDir, filename);

                    if (!fs.existsSync(dest)) {
                        console.log(`Downloading ${filename} ...`);
                        await downloadFile(url, dest);
                        count++;
                    } else {
                        console.log(`File ${filename} already exists. Skipping.`);
                    }
                } catch (err) {
                    console.error('Error downloading:', err);
                }
            }

            nextCursor = result.next_cursor;
        } while (nextCursor);

        console.log(`\n✅ Done! Downloaded ${count} images to ${uploadDir}`);
    } catch(err) {
        console.error('Error listing resources from Cloudinary:', err);
    }
}

fetchAndDownload().catch(console.error);
