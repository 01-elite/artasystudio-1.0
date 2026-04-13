const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const axios = require("axios");

const Analytics = require('./models/Analytics');
const { paymentRoutes } = require('./routes/ProductRoutes');
const authRoutes = require('./routes/authRoutes');
const artRoutes = require('./routes/artRoutes');
const commerceRoutes = require('./routes/commerceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const Artwork = require("./models/Artwork");

const app = express();

// =======================
// 1. MIDDLEWARES
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// =======================
// 2. STATIC FILES
// =======================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================
// 3. DATABASE
// =======================
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("✅ ArtVista DB Connected!"))
  .catch(err => console.error("❌ DB ERROR:", err.message));

// =======================
// 4. ROUTES
// =======================
app.use('/api/auth', authRoutes);
app.use('/api/art', artRoutes);
app.use('/api/commerce', commerceRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/analytics/users', async (req, res) => {
  try {
    const data = await Analytics.find({});
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching analytics", error: err.message });
  }
});

// =======================
// 🔥 CHAT ROUTE (FIXED)
// =======================
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message || "";
  const msg = userMessage.toLowerCase();

  try {
    // =======================
    // 🤖 AI CALL
    // =======================
    let aiData = { type: "search", filters: {} };

    try {
      const aiResponse = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openai/gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `
Return ONLY JSON:
{
  "type": "search" OR "general",
  "filters": {
    "category": string | null,
    "price": { "$gte": number, "$lte": number } | null,
    "likes": { "$gte": number } | null,
    "isAuction": boolean | null,
    "isSold": boolean | null,
    "sort": { "price": 1 | -1, "likes": 1 | -1 } | null
  },
  "answer": string
}`
            },
            { role: "user", content: userMessage }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      let aiText = aiResponse.data.choices[0].message.content;
      aiText = aiText.replace(/```json|```/g, "").trim();

      aiData = JSON.parse(aiText);

    } catch (err) {
      console.log("⚠️ AI failed, using fallback");
    }

    // =======================
    // 🔥 FORCE SEARCH
    // =======================
    if (
      /\d+/.test(msg) ||
      msg.includes("art") ||
      msg.includes("painting") ||
      msg.includes("price") ||
      msg.includes("buy")
    ) {
      aiData.type = "search";
    }

    // =======================
    // 🧠 GENERAL RESPONSE
    // =======================
    if (aiData.type === "general") {
      return res.json({
        reply: aiData.answer || "Ask me about artworks 🎨",
        type: "text"
      });
    }

    // =======================
    // 🔍 BUILD QUERY
    // =======================
    let query = {};
    let sort = {};
    const filters = aiData.filters || {};

    // ✅ CATEGORY
    if (filters.category) {
      query.category = filters.category;
    }

    // =======================
    // 💰 SAFE PRICE (AI)
    // =======================
    if (filters.price && typeof filters.price === "object") {
      const gte = Number(filters.price.$gte);
      const lte = Number(filters.price.$lte);

      if (!(gte && lte && gte > lte)) {
        query.price = {};
        if (!isNaN(gte)) query.price.$gte = gte;
        if (!isNaN(lte)) query.price.$lte = lte;
      }
    }

    // =======================
    // 🔥 FALLBACK PRICE FIX
    // =======================
    let priceFilter = {};

    // GREATER
    if (
      msg.includes("above") ||
      msg.includes("greater") ||
      msg.includes("more than") ||
      msg.includes("over") ||
      msg.includes("higher")
    ) {
      const num = msg.match(/\d+/);
      if (num) priceFilter = { $gte: Number(num[0]) };
    }

    // LESS
    else if (
      msg.includes("below") ||
      msg.includes("less") ||
      msg.includes("under") ||
      msg.includes("lower")
    ) {
      const num = msg.match(/\d+/);
      if (num) priceFilter = { $lte: Number(num[0]) };
    }

    // BETWEEN
    else if (msg.includes("between")) {
      const nums = msg.match(/\d+/g);
      if (nums && nums.length >= 2) {
        priceFilter = {
          $gte: Number(nums[0]),
          $lte: Number(nums[1])
        };
      }
    }

    // CHEAP / EXPENSIVE
    if (msg.includes("cheap")) priceFilter = { $lte: 3000 };
    if (msg.includes("expensive")) priceFilter = { $gte: 10000 };

    // APPLY PRICE (override invalid AI)
    if (Object.keys(priceFilter).length > 0) {
      query.price = priceFilter;
    }

    // =======================
    // ❤️ LIKES
    // =======================
    if (msg.includes("popular") || msg.includes("top")) {
      query.likes = { $gte: 10 };
      sort.likes = -1;
    }

    // =======================
    // 🔃 SORT
    // =======================
    if (msg.includes("cheapest")) sort.price = 1;
    if (msg.includes("most expensive")) sort.price = -1;

    if (filters.sort) {
      sort = { ...sort, ...filters.sort };
    }

    // =======================
    // FLAGS
    // =======================
    if (typeof filters.isAuction === "boolean") {
      query.isAuction = filters.isAuction;
    }

    if (typeof filters.isSold === "boolean") {
      query.isSold = filters.isSold;
    }

    console.log("🔥 FINAL QUERY:", query);
    console.log("🔥 FINAL SORT:", sort);

    // =======================
    // 📦 DB QUERY
    // =======================
    const results = await Artwork.find(query).sort(sort).limit(5);

    if (!results.length) {
      return res.json({
        reply: "No artworks found 😢 Try different filters.",
        type: "text"
      });
    }

    return res.json({
      reply: results.map(a => ({
        id: a._id,
        title: a.title,
        price: a.price,
        category: a.category,
        image: a.image,
        likes: a.likes
      })),
      type: "artworks"
    });

  } catch (err) {
    console.error("🔥 ERROR:", err.message);
    res.status(500).json({
      reply: "Server error occurred",
      type: "text"
    });
  }
});

// =======================
// SERVER START
// =======================
app.get('/', (req, res) => res.send("🚀 ArtVista Backend Live!"));

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});