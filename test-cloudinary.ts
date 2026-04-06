import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from './src/models/Post';
import https from 'https';

dotenv.config();

const url = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/artedigital';

async function test() {
    await mongoose.connect(url);
    console.log('Connected to DB');
    
    // Find some posts with Cloudinary images
    const posts = await Post.find({ imageUrl: { $regex: 'cloudinary', $options: 'i' } }).limit(5);
    
    console.log(`Found ${posts.length} posts with cloudinary images.`);
    
    for (const post of posts) {
        console.log(`Post ID: ${post._id}, URL: ${post.imageUrl}`);
        // let's try a heads request or get request
        await new Promise((resolve) => {
            https.get(post.imageUrl, (res) => {
                console.log(`GET ${post.imageUrl} -> ${res.statusCode}`);
                resolve(null);
            }).on('error', (e) => {
                console.error(`Error fetching ${post.imageUrl}:`, e.message);
                resolve(null);
            });
        });
    }
    
    await mongoose.disconnect();
}

test().catch(console.error);
