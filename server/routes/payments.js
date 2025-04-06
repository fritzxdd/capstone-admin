// routes/payments.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Payment routes
router.post('/create-checkout-session', paymentController.createCheckoutSession);
router.get('/verify-payment', paymentController.verifyPayment);

module.exports = router;