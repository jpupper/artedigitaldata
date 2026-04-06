const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const UserSchema = new mongoose.Schema({
    username: String,
    role: String,
    permissions: Object
});

async function run() {
    const authUri = process.env.MONGODB_AUTH_URI || process.env.MONGODB_URI;
    await mongoose.connect(authUri);
    const User = mongoose.model('User', UserSchema);
    
    // Check jp role
    const jp = await User.findOne({ username: /jpupper/i });
    if(jp) {
        console.log("Updating role for JPUPPER");
        let perms = jp.permissions || {};
        if(!perms.artedigital) perms.artedigital = {};
        perms.artedigital.role = 'ADMINISTRADOR';
        jp.permissions = perms;
        jp.role = 'ADMIN';
        jp.markModified('permissions');
        await jp.save();
        console.log("Successfully updated JPUPPER as admin");
    } else {
        console.log("JPUPPER not found in db");
    }
    process.exit();
}
run();
