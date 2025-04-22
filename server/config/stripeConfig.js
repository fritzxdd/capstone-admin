// server/config/stripeConfig.js

/**
 * Stripe configuration with error handling and validation
 */

const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

// Get Stripe key with fallback
const getStripeKey = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  
  if (!key) {
    console.error('⚠️ STRIPE_SECRET_KEY is not defined in environment variables');
    return null;
  }
  
  // Basic validation - Stripe keys start with 'sk_'
  if (!key.startsWith('sk_')) {
    console.error('⚠️ STRIPE_SECRET_KEY appears to be invalid (should start with sk_)');
    return null;
  }
  
  return key;
};

// Initialize Stripe with lazy loading to prevent startup errors
let stripeInstance = null;

const getStripe = () => {
  if (!stripeInstance) {
    const stripeKey = getStripeKey();
    
    if (!stripeKey) {
      throw new Error('Stripe secret key is not configured properly');
    }
    
    try {
      stripeInstance = require('stripe')(stripeKey);
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw new Error('Failed to initialize Stripe payment provider');
    }
  }
  
  return stripeInstance;
};

// Verify that Stripe is properly configured
const verifyStripeConfig = async () => {
  try {
    const stripeKey = getStripeKey();
    
    if (!stripeKey) {
      return false;
    }
    
    const stripe = getStripe();
    
    // Try to make a simple call to Stripe API
    await stripe.paymentMethods.list({ limit: 1 });
    console.log('✅ Stripe configuration verified');
    return true;
  } catch (error) {
    console.error('❌ Stripe configuration error:', error.message);
    return false;
  }
};

// Create a new checkout session
const createCheckoutSession = async ({
  amount,
  currency = 'php',
  productName,
  successUrl,
  cancelUrl,
  metadata = {}
}) => {
  try {
    const stripe = getStripe();
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: productName,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents and ensure integer
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata
    });
    
    return { success: true, session };
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    return { 
      success: false, 
      error: {
        message: error.message,
        type: error.type,
        code: error.code
      }
    };
  }
};

// Retrieve a checkout session
const retrieveSession = async (sessionId) => {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return { success: true, session };
  } catch (error) {
    console.error('Error retrieving Stripe session:', error);
    return { 
      success: false, 
      error: {
        message: error.message,
        type: error.type,
        code: error.code
      }
    };
  }
};

module.exports = {
  getStripe,
  verifyStripeConfig,
  createCheckoutSession,
  retrieveSession
};