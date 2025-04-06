// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin with service account
// For a real implementation, use a secure method to provide credentials
// You can use process.env.FIREBASE_SERVICE_ACCOUNT or load from a file
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://weassist-f2a77-default-rtdb.firebaseio.com",
});

// Import routes
const authRoutes = require('./routes/auth');
const plansRoutes = require('./routes/plans');
const paymentsRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/users', userRoutes);
app.use('/', paymentsRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Law Firm Admin API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});