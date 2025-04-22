// api/test.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = async (req, res) => {
  try {
    const response = {
      status: 'API is running',
      timestamp: new Date().toISOString(),
      environment: {
        node_version: process.version,
        env: process.env.NODE_ENV || 'development'
      },
      config: {
        firebase_url: process.env.FIREBASE_DATABASE_URL ? 'configured ✅' : 'missing ❌',
        stripe_key: process.env.STRIPE_SECRET_KEY ? 'configured ✅' : 'missing ❌',
        stripe_key_valid: process.env.STRIPE_SECRET_KEY?.startsWith('sk_') ? 'looks valid ✅' : 'invalid format ❌',
        firebase_service_account: process.env.FIREBASE_SERVICE_ACCOUNT ? 'configured ✅' : 'missing ❌'
      }
    };
    
    // Try to initialize Stripe if the key is present
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        // Just a simple API call to check if the key works
        const paymentMethods = await stripe.paymentMethods.list({ limit: 1 });
        response.stripe_test = 'Connected successfully ✅';
      } catch (stripeError) {
        response.stripe_test = `Connection failed: ${stripeError.message} ❌`;
      }
    } else {
      response.stripe_test = 'Not tested (key missing) ❌';
    }
    
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? '🙈' : error.stack
    });
  }
};