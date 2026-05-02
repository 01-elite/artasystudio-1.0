const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // ✅ AI-BASED BEHAVIOR TRACKING WITH SCORING SYSTEM
    // Structure: { artworkId, action, points, timestamp }
    userInteractions: [{
        artworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' },
        action: { type: String, enum: ['like', 'view', 'purchase', 'timeSpent'], required: true },
        points: { type: Number, default: 0 },
        timestamp: { type: Date, default: Date.now }
    }],
    
    viewedArt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],
    bidArt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],
    purchasedArt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],
    
    // ✅ TIME TRACKING FOR EACH ARTWORK
    artViewDuration: [{
        artworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' },
        totalTimeSeconds: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
    }],
    
    // ✅ PROFILE EDITING
    username: { 
        type: String, 
        unique: true, 
        sparse: true,
        default: null 
    }, 
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