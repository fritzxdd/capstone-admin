// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin with service account
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
  : require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://weassist-f2a77-default-rtdb.firebaseio.com",
});

// Import routes
const authRoutes = require('./routes/auth');
const plansRoutes = require('./routes/plans');
const paymentsRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const subscriptionRoutes = require('./routes/subscriptions');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable better logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Payment routes - these need to be directly on /api
app.use('/api', paymentsRoutes);

// Specifically add the create-checkout-session route
const paymentController = require('./controllers/paymentController');
app.post('/api/create-checkout-session', paymentController.createCheckoutSession);

// Base route
app.get('/api', (req, res) => {
  res.send('Law Firm Admin API is running');
});

// Serve static files if in production
if (process.env.NODE_ENV === 'production') {
  // Serve client build files
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Error: ${err.stack}`);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Stripe key status: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Missing'}`);
});