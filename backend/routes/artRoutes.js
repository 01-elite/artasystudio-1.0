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

        if (!art) {
            return res.status(404).json({ message: "Artwork not found" });
        }

        // ✅ CHECK: Auction expired or not
        const now = new Date();
        if (art.auctionEnd && new Date(art.auctionEnd) < now) {

            // 🔥 AUTO-CONVERT AUCTION → NORMAL PRODUCT
            if (art.isAuction) {
                art.isAuction = false;
                art.price = art.highestBid || art.price;
                await art.save();
            }

            return res.status(400).json({ 
                message: "Auction has ended. Bidding is closed." 
            });
        }

        // ❌ Prevent invalid bid
        const currentBid = art.highestBid || art.price;
        if (amount <= currentBid) {
            return res.status(400).json({ 
                message: `Bid must be higher than ₹${currentBid}` 
            });
        }

        // ✅ Record user bid behavior
        if (userId) {
            await User.findByIdAndUpdate(userId, { 
                $addToSet: { bidArt: req.params.artId } 
            });
        }

        // ✅ Update bid
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

// ✅ NEW ADDITION: 5. POINT-BASED SCORING SYSTEM FOR INTERACTIONS

// 5a. Track Like Action (+5 Points)
router.post('/track-like', async (req, res) => {
    try {
        const { userId, artId } = req.body;
        if (!userId || !artId) return res.status(400).json({ message: "userId and artId required" });

        // Check if already liked
        const user = await User.findById(userId);
        const alreadyLiked = user.userInteractions.some(
            i => i.artworkId.toString() === artId && i.action === 'like'
        );

        if (alreadyLiked) {
            return res.status(400).json({ message: "Already liked" });
        }

        // Record interaction with 5 points
        await User.findByIdAndUpdate(userId, {
            $addToSet: { likedArt: artId },
            $push: { 
                userInteractions: {
                    artworkId: artId,
                    action: 'like',
                    points: 5
                }
            }
        });

        res.status(200).json({ message: "Like recorded (+5 points)" });
    } catch (err) {
        res.status(500).json({ message: "Like tracking failed" });
    }
});

// 5b. Track View Action (+2 Points)
router.post('/track-view', async (req, res) => {
    try {
        const { userId, artId } = req.body;
        if (!userId || !artId) return res.status(400).json({ message: "userId and artId required" });

        // Record interaction with 2 points
        await User.findByIdAndUpdate(userId, {
            $addToSet: { viewedArt: artId },
            $push: { 
                userInteractions: {
                    artworkId: artId,
                    action: 'view',
                    points: 2
                }
            }
        });

        res.status(200).json({ message: "View recorded (+2 points)" });
    } catch (err) {
        res.status(500).json({ message: "View tracking failed" });
    }
});

// 5c. Track Purchase Action (+15 Points)
router.post('/track-purchase', async (req, res) => {
    try {
        const { userId, artId } = req.body;
        if (!userId || !artId) return res.status(400).json({ message: "userId and artId required" });

        // Record interaction with 15 points
        await User.findByIdAndUpdate(userId, {
            $addToSet: { purchasedArt: artId },
            $push: { 
                userInteractions: {
                    artworkId: artId,
                    action: 'purchase',
                    points: 15
                }
            }
        });

        res.status(200).json({ message: "Purchase recorded (+15 points)" });
    } catch (err) {
        res.status(500).json({ message: "Purchase tracking failed" });
    }
});

// 5d. Track Time Spent (>30 seconds = +4 Points)
router.post('/track-time-spent', async (req, res) => {
    try {
        const { userId, artId, timeSeconds } = req.body;
        if (!userId || !artId || timeSeconds === undefined) {
            return res.status(400).json({ message: "userId, artId, and timeSeconds required" });
        }

        const timeSpent = parseInt(timeSeconds);
        
        // Only give points if time spent > 30 seconds
        if (timeSpent > 30) {
            await User.findByIdAndUpdate(userId, {
                $push: { 
                    userInteractions: {
                        artworkId: artId,
                        action: 'timeSpent',
                        points: 4
                    }
                }
            });

            // Update or create art view duration record
            await User.findByIdAndUpdate(userId, {
                $addToSet: { artViewDuration: { artworkId: artId, totalTimeSeconds: timeSpent } }
            });

            return res.status(200).json({ message: `Time spent recorded (+4 points)` });
        } else {
            return res.status(200).json({ message: `Less than 30 seconds (${timeSpent}s) - no points awarded` });
        }
    } catch (err) {
        res.status(500).json({ message: "Time tracking failed" });
    }
});

// ✅ UPDATED: 6. BEHAVIORAL AI RECOMMENDATION ENGINE WITH POINT-BASED SCORING
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

                    // Calculate total interaction points for this artwork
                    const interactions = user.userInteractions.filter(
                        i => i.artworkId?.toString() === idStr
                    );
                    
                    interactions.forEach(interaction => {
                        score += interaction.points || 0;
                    });

                    // Bonus: Same category as currently viewed (+10 bonus points)
                    if (art.category === currentArt.category) score += 10;

                    // Bonus: Similar creator
                    if (art.creator?.toString() === currentArt.creator?.toString()) score += 8;

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

// ✅ GET USER INTERACTION SCORE (for analytics/profile)
router.get('/user-interaction-score/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const interactions = user.userInteractions || [];
        const totalPoints = interactions.reduce((sum, i) => sum + (i.points || 0), 0);
        
        const breakdown = {
            likes: interactions.filter(i => i.action === 'like').length * 5,
            views: interactions.filter(i => i.action === 'view').length * 2,
            purchases: interactions.filter(i => i.action === 'purchase').length * 15,
            timeSpent: interactions.filter(i => i.action === 'timeSpent').length * 4,
            totalPoints: totalPoints
        };

        res.status(200).json(breakdown);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch interaction score" });
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