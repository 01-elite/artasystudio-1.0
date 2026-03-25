const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // ✅ NEW AI-BASED BEHAVIOR TRACKING (Added)
    viewedArt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],
    bidArt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],
    
    // ✅ NEW PLACES FOR PERMANENT STORAGE (Kept)
    username: { type: String, unique: true, sparse: true }, 
    categoryPreferences: [{ type: String }], // Array for multiple interests
    
    role: { type: String, enum: ['user', 'creator', 'admin'], default: 'user' },
    address: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        phone: { type: String, default: '' } 
    },
    profilePic: { type: String, default: '' },
    bio: { type: String, default: 'Digital Artist & Curator' },
    likedArt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }]
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);