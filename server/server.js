// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Setup error handler
const errorHandler = require('./middleware/errorHandler');

// Initialize Firebase Admin
let firebaseInitialized = false;
try {
  let serviceAccount;
  
  // Try to get service account from environment variable first
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (parseError) {
      console.error('Error parsing Firebase service account from env variable:', parseError);
    }
  }
  
  // If not available from env, try to load from file
  if (!serviceAccount) {
    try {
      if (fs.existsSync('./firebase-service-account.json')) {
        serviceAccount = require('./firebase-service-account.json');
      }
    } catch (fileError) {
      console.error('Error loading Firebase service account from file:', fileError);
    }
  }
  
  // Initialize Firebase if we have a service account
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://weassist-f2a77-default-rtdb.firebaseio.com",
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.error('❌ No Firebase service account available');
  }
} catch (initError) {
  console.error('❌ Firebase initialization error:', initError);
}

// Test Stripe configuration
let stripeConfigured = false;
try {
  const { verifyStripeConfig } = require('./config/stripeConfig');
  verifyStripeConfig().then(isValid => {
    stripeConfigured = isValid;
  });
} catch (stripeError) {
  console.error('❌ Stripe configuration error:', stripeError);
}

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'API is running',
    firebase: firebaseInitialized ? 'connected' : 'not connected',
    stripe: stripeConfigured ? 'configured' : 'not configured',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Import route handlers
const authRoutes = require('./routes/auth');
const plansRoutes = require('./routes/plans');
const paymentsRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const subscriptionRoutes = require('./routes/subscriptions');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Payment routes - these need to be directly on /api
app.use('/api', paymentsRoutes);

// Base route
app.get('/api', (req, res) => {
  res.json({
    message: 'Law Firm Admin API is running',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/api/health'
  });
});

// Serve static files if in production
if (process.env.NODE_ENV === 'production') {
  // Serve client build files
  const clientBuildPath = path.join(__dirname, '../client/dist');
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    
    // Handle React routing
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
      }
    });
    console.log('✅ Serving static files from', clientBuildPath);
  } else {
    console.warn('⚠️ Client build directory not found at', clientBuildPath);
  }
}

// Error handling middleware - must be after all routes
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════╗
  ║                   SERVER STARTED                   ║
  ╠════════════════════════════════════════════════════╣
  ║  📡 Server running on port ${PORT.toString().padEnd(21, ' ')} ║
  ║  🔥 Firebase: ${(firebaseInitialized ? 'Connected ✅' : 'Not Connected ❌').padEnd(30, ' ')} ║
  ║  💳 Stripe:   ${(stripeConfigured ? 'Configured ✅' : 'Not Configured ❌').padEnd(30, ' ')} ║
  ║  🌐 Environment: ${(process.env.NODE_ENV || 'development').padEnd(27, ' ')} ║
  ╚════════════════════════════════════════════════════╝
  `);
});

module.exports = app;