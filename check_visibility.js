const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/artedigital').then(async () => {
  const Post = require('./dist/src/models/Post').default;
  const p1 = await Post.findOne();
  console.log('Post visibility:', p1 ? p1.visibility : 'no post found');
  console.log('Post visibility type:', p1 ? typeof p1.visibility : 'N/A');
  const all = await Post.find();
  console.log('Total posts:', all.length);
  const withVis = await Post.find({visibility: 'public'});
  console.log('With visibility public:', withVis.length);
  const withVisExists = await Post.find({visibility: {$exists: true}});
  console.log('With visibility exists:', withVisExists.length);
  const withVisNull = await Post.find({visibility: null});
  console.log('With visibility null:', withVisNull.length);
  const withVisUndefined = await Post.find({visibility: {$exists: false}});
  console.log('With visibility undefined:', withVisUndefined.length);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
