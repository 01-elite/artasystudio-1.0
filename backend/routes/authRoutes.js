const express = require('express');
const router = express.Router();
const User = require('../models/User');

// --- 1. PROFILE UPDATE (Username, Role, Categories, Address) ---
router.put('/update-address/:userId', async (req, res) => {
    try {
        const { username, role, categoryPreferences, address } = req.body;
        
        // Check if username is already taken by another user
        if (username && username.trim() !== '') {
            const existingUser = await User.findOne({ 
                username: username,
                _id: { $ne: req.params.userId } // Exclude current user
            });
            
            if (existingUser) {
                return res.status(400).json({ message: "Username already taken. Choose a different one." });
            }
        }

        const updateData = { 
            role: role,
            categoryPreferences: categoryPreferences || [],
            address: address || {}
        };

        // Only update username if provided and not empty
        if (username && username.trim() !== '') {
            updateData.username = username;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: updateData },
            { new: true, runValidators: false } // Disable validators to avoid duplicate key error
        );

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        console.log("User updated successfully:", updatedUser._id);
        res.json(updatedUser);
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ message: err.message || "Update failed" });
    }
});

// --- 2. FIXED LIKE LOGIC (Safe Array Handling) ---
router.put('/like-art', async (req, res) => {
    try {
        const { userId, artId } = req.body;
        const user = await User.findById(userId);
        
        if (!user) return res.status(404).json({ message: "User not found" });

        // ✅ Initialization Fix: Agar likedArt undefined hai toh initialize karein
        if (!user.likedArt) {
            user.likedArt = [];
        }

        const isLiked = user.likedArt.includes(artId);
        
        if (isLiked) {
            // Remove artId from array
            user.likedArt = user.likedArt.filter(id => id.toString() !== artId);
        } else {
            // Add artId to array
            user.likedArt.push(artId);
        }
        
        await user.save();
        res.json(user); // Returns updated user with new likedArt array
    } catch (err) {
        console.error("Like Action Error:", err);
        res.status(500).json({ message: "Like action failed" });
    }
});

// --- 3. FETCH LIKED DETAILS (Populated for Profile Grid) ---
router.get('/liked-details/:userId', async (req, res) => {
    try {
        // Populates 'likedArt' with actual artwork data (image, title, etc.)
        const user = await User.findById(req.params.userId).populate('likedArt');
        if (!user) return res.status(404).json({ message: "User not found" });
        
        res.json(user.likedArt || []);
    } catch (err) {
        console.error("Fetch Liked Error:", err);
        res.status(500).json({ message: "Error fetching liked artwork" });
    }
});

// --- 4. AUTH & COMMUNITY ROUTES ---
router.post('/register', async (req, res) => {
    try {
        const newUser = await User.create(req.body);
        res.status(201).json(newUser);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user || user.password !== req.body.password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        res.json(user);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/followers/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('followers', 'name email');
        res.json(user.followers || []);
    } catch (err) { res.status(500).json({ message: "Error fetching community" }); }
});

module.exports = router;