// api/index.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');


dotenv.config({ path: '../server/.env' });
// Initialize Firebase Admin
let serviceAccount;
try {
  // Try to parse the service account from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('Parsed service account from environment variable');
  } else {
    console.error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
  }
} catch (error) {
  console.error('Error parsing Firebase service account:', error);
}

// Initialize Firebase Admin with service account if available
if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://weassist-f2a77-default-rtdb.firebaseio.com",
      });
      console.log('Firebase Admin initialized successfully');
    } catch (initError) {
      console.error('Firebase initialization error:', initError);
    }
  } else {
    console.error('No Firebase service account available, API will not function correctly');
  }

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import route handlers
const authRoutes = require('../server/routes/auth');
const plansRoutes = require('../server/routes/plans');
const paymentsRoutes = require('../server/routes/payments');
const userRoutes = require('../server/routes/users');

// Base route for health check
app.get('/api', (req, res) => {
  res.json({ status: 'API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/users', userRoutes);
app.use('/api', paymentsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: err.message 
  });
});

// Export the Express API
module.exports = app;