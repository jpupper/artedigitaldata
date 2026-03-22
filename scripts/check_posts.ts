import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const ART_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';

async function checkPosts() {
  try {
    const artConn = await mongoose.createConnection(ART_URI).asPromise();
    const Post = artConn.model('Post', new mongoose.Schema({}, { strict: false, collection: 'posts' }));

    const posts = await Post.find({}, 'title author').limit(10);
    console.log('--- Posts en Arte Digital ---');
    posts.forEach((p: any) => console.log(`${p.get('title')} | Autor ID: ${p.get('author')}`));

    const authors = await Post.distinct('author');
    console.log('\n--- IDs de Autores únicos en Posts ---');
    console.log(authors);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkPosts();
