// routes/subscriptions.js
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

// Subscription routes
router.post('/', subscriptionController.createSubscription);
router.get('/:userId', subscriptionController.getSubscription);
router.get('/status/:userId', subscriptionController.checkSubscriptionStatus);

module.exports = router;