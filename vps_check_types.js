const mongoose = require('mongoose');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/fullscreen_global');
    const user = await mongoose.connection.db.collection('users').findOne();
    console.log('--- USER SAMPLE ---');
    console.log('ID Type:', typeof user._id);
    console.log('ID Value:', user._id);
    console.log(JSON.stringify(user, null, 2));
    
    await mongoose.disconnect();
    
    await mongoose.connect('mongodb://127.0.0.1:27017/artedigital');
    const post = await mongoose.connection.db.collection('posts').findOne();
    console.log('\n--- POST SAMPLE ---');
    console.log('ID Type:', typeof post._id);
    console.log('Author Type:', typeof post.author);
    console.log(JSON.stringify(post, null, 2));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
