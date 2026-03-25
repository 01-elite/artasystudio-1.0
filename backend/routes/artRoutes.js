const express = require('express');
const router = express.Router();
const Artwork = require('../models/Artwork');
const User = require('../models/User'); // ✅ NEW ADDITION: Import User for AI logic
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// 1. Storage Configuration (Kept Original)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'artworks',
        allowed_formats: ['jpg', 'png', 'jpeg','heic','webp'],
    },
});

const upload = multer({ storage });

// 2. Fetch All Art (Explore - Kept Original)
router.get('/explore', async (req, res) => {
    try {
        const artworks = await Artwork.find().populate('creator', 'name').sort({ createdAt: -1 });
        res.json(artworks);
    } catch (err) { 
        res.status(500).json({ message: "Explore fetch failed" }); 
    }
});

// 3. Upload Art (Kept Original FIXED Logic)
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Image file is required" });
        }

        const { title, price, description, category, creatorId, isAuction, auctionEnd } = req.body;

        const newArt = await Artwork.create({
            title,
            price: Number(price),
            description,
            category,
            creator: creatorId,
            isAuction: isAuction === 'true',
            auctionEnd: isAuction === 'true' && auctionEnd ? new Date(auctionEnd) : null,
            highestBid: isAuction === 'true' ? Number(price) : 0,
            image: req.file.path,
            public_id: req.file.filename || req.file.public_id || `art_${Date.now()}` 
        });

        res.status(201).json(newArt);
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(400).json({ message: err.message });
    }
});

// 4. Bidding Logic (Enhanced with AI weight recording)
router.put('/bid/:artId', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const art = await Artwork.findById(req.params.artId);

        if (amount <= art.highestBid) {
            return res.status(400).json({ message: "Bid must be higher than current highest bid" });
        }

        // ✅ NEW ADDITION: Record bid behavior in User Profile (Weight: 10 points)
        if (userId) {
            await User.findByIdAndUpdate(userId, { $addToSet: { bidArt: req.params.artId } });
        }

        const updatedArt = await Artwork.findByIdAndUpdate(
            req.params.artId,
            { 
                $set: { highestBid: amount, highestBidder: userId },
                $push: { bids: { bidder: userId, amount: amount } }
            },
            { new: true }
        ).populate('bids.bidder', 'name');

        res.json(updatedArt);
    } catch (err) { 
        res.status(500).json({ message: "Bidding failed" }); 
    }
});

// ✅ NEW ADDITION: 5. BEHAVIORAL AI RECOMMENDATION ENGINE
router.get('/recommend/:artId', async (req, res) => {
    try {
        const { artId } = req.params;
        const userId = req.query.userId;

        const currentArt = await Artwork.findById(artId);
        if (!currentArt) return res.status(404).json({ message: "Art not found" });

        // Analyze all artworks for behavior matching
        let potentialRecs = await Artwork.find({
            _id: { $ne: artId },
            isSold: false
        }).populate('creator', 'name').lean();

        if (userId && userId !== "undefined") {
            const user = await User.findById(userId);
            if (user) {
                potentialRecs = potentialRecs.map(art => {
                    let score = 0;
                    const idStr = art._id.toString();

    
                    // Scoring Points System
                    if (user.bidArt?.some(id => id.toString() === idStr)) score += 10;
                    if (user.likedArt?.some(id => id.toString() === idStr)) score += 7;
                    if (user.viewedArt?.some(id => id.toString() === idStr)) score += 10;
                    if (art.category === currentArt.category) score += 20;

                    return { ...art, aiScore: score };
                });

                // Sort by highest score (Personalization Analysis)
                potentialRecs.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0) || b.createdAt - a.createdAt);
            }
        } else {
            // Guest fallback by popularity
            potentialRecs.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        }

        res.status(200).json(potentialRecs.slice(0, 8));
    } catch (error) {
        res.status(500).json({ message: "Recommendation failed" });
    }
});

// ✅ NEW ADDITION: 6. TRACKING ROUTE (Record View Behavior - Weight: 3 points)
router.put('/track-view', async (req, res) => {
    try {
        const { userId, artId } = req.body;
        // Saves view to User profile for permanent AI learning
        await User.findByIdAndUpdate(userId, { $addToSet: { viewedArt: artId } });
        res.status(200).json({ message: "Behavior recorded" });
    } catch (err) {
        res.status(500).json({ message: "Tracking failed" });
    }
});

// 7. User artworks (Kept Original)
router.get('/user/:userId', async (req, res) => {
    try {
        const posts = await Artwork.find({ creator: req.params.userId }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) { 
        res.status(500).json({ message: err.message }); 
    }
});

module.exports = router;