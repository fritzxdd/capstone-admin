// api/index.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin if credentials are available
let firebaseInitialized = false;
try {
  // Get Firebase credentials
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (error) {
      console.error('Error parsing Firebase service account:', error);
    }
  }
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized');
  } else {
    console.error('Firebase service account not available');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Basic routes
app.get('/api', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    firebase: firebaseInitialized ? 'connected' : 'not connected'
  });
});

// Test Stripe configuration
app.get('/api/stripe-test', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: 'Stripe secret key is not configured' });
    }
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.paymentMethods.list({ limit: 1 });
    
    res.status(200).json({ status: 'Stripe is correctly configured' });
  } catch (error) {
    res.status(500).json({ error: 'Stripe configuration error', message: error.message });
  }
});

// Plans API
app.get('/api/plans', (req, res) => {
  // Return subscription plans
  const plans = [
    {
      id: "plan_1month",
      name: "1 Month Plan",
      price: "₱500",
      amount: 500,
      duration: 30,
      description: "Access premium features for one month."
    },
    {
      id: "plan_6months",
      name: "6 Months Plan",
      price: "₱2,500",
      amount: 2500,
      duration: 180,
      description: "Enjoy premium features for six months at a discounted rate."
    },
    {
      id: "plan_1year",
      name: "1 Year Plan",
      price: "₱4,800",
      amount: 4800,
      duration: 365,
      description: "Get the best value with a full-year subscription."
    }
  ];
  
  res.status(200).json(plans);
});

// Stripe checkout endpoint
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { planId, planName, amount, success_url, cancel_url } = req.body;
    
    console.log('Received checkout request:', {
      planId,
      planName,
      amount,
      success_url,
      cancel_url
    });
    
    if (!planId || !planName || !amount) {
      return res.status(400).json({ error: 'Missing required payment information' });
    }
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe secret key is not configured' });
    }
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'php',
            product_data: {
              name: planName,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || `${req.headers.origin || 'https://capstone-admin-beige.vercel.app'}/payment-success?payment_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.origin || 'https://capstone-admin-beige.vercel.app'}/plans`,
      metadata: {
        planId,
        planName
      }
    });
    
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ 
      error: 'Payment processing error',
      message: error.message,
      code: error.code || error.type
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: 'Server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Export the Express API for Vercel
module.exports = app;