import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
    }
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'fscapps';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export async function uploadToR2(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    application: string,
    subfolder: string = 'uploads'
): Promise<{ id: string; url: string }> {
    if (!process.env.R2_ACCESS_KEY_ID) {
        throw new Error('Cloudflare R2 credentials missing in .env');
    }

    const key = `${application}/${subfolder}/${Date.now()}_${filename}`;

    const parallelUploads3 = new Upload({
        client: r2Client,
        params: {
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimetype
        }
    });

    await parallelUploads3.done();

    const url = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : `https://${R2_BUCKET}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

    return { id: key, url };
}

export async function deleteFromR2(key: string): Promise<void> {
    await r2Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key
    }));
}

export { r2Client, R2_BUCKET, R2_PUBLIC_URL };
