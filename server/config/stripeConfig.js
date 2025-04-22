// Create or update server/config/stripeConfig.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Verify that Stripe is properly configured
const verifyStripeConfig = async () => {
  try {
    // Try to make a simple call to Stripe API to verify the key works
    await stripe.paymentMethods.list({ limit: 1 });
    console.log('✅ Stripe configuration verified');
    return true;
  } catch (error) {
    console.error('❌ Stripe configuration error:', error.message);
    return false;
  }
};

module.exports = {
  stripe,
  verifyStripeConfig
};