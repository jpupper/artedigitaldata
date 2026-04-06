const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const UserSchema = new mongoose.Schema({
    username: String,
    permissions: Object
});

async function run() {
    const authUri = process.env.MONGODB_AUTH_URI || process.env.MONGODB_URI;
    await mongoose.connect(authUri);
    const User = mongoose.model('User', UserSchema);
    
    // Check jp role
    const jp = await User.findOne({ username: /jpupper/i });
    console.log("JPUPPER details:", JSON.stringify(jp, null, 2));

    process.exit();
}
run();
