const instance = require('../config/razorpay');
const crypto = require('crypto');
const Payment = require('../models/payment');
const User = require('../models/User');
const Artwork = require('../models/Artwork');
const Analytics = require('../models/Analytics');

const paymentverification = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.params.userId;
    const artworkId = req.query.artworkId; 

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        return res.redirect(`http://localhost:3000/payment-fail`);
    }

    const orderDetails = await instance.orders.fetch(razorpay_order_id);
    const user = await User.findById(userId);
    
    const shippingAddress = {
        street: user.address?.street || "Not Provided",
        city: user.address?.city || "Not Provided",
        state: user.address?.state || "Not Provided",
        pincode: user.address?.pincode || "000000",
        phone: user.address?.phone || "0000000000"
    };

    await Payment.create({
      razorpay_order_id,
      razorpay_payment_id,
      amount: orderDetails.amount, 
      artworkId: artworkId, 
      name: user.name,
      email: user.email,
      address: shippingAddress 
    });
    
    // ✅ LOGIC: Credit Creator, Update Analytics, and MARK AS SOLD
    const artwork = await Artwork.findById(artworkId);
    if (artwork) {
      artwork.isSold = true; // Item is now officially off the market
      await artwork.save();

      await Analytics.create({
        price: orderDetails.amount / 100,
        city: shippingAddress.city,
        state: shippingAddress.state,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        categories: artwork.category,
      });
    }

    return res.redirect(`http://localhost:3000/payment-success?reference=${razorpay_payment_id}`);

  } catch (error) {
    res.status(500).send("Internal Server Error: " + error.message);
  }
};

module.exports = { paymentverification /* plus other existing exports */ };