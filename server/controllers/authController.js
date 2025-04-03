// controllers/authController.js
const admin = require('firebase-admin');
const db = admin.database();
const axios = require('axios');

exports.login = async (req, res) => {
  try {
    // Login is handled by Firebase client SDK
    // This endpoint is for any additional server-side logic
    res.status(200).json({ message: 'Login endpoint' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// In server/controllers/authController.js

exports.register = async (req, res) => {
  try {
    // Extract user data from request
    const userData = req.body;
    
    // Create the user with Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.lawFirm || '',
    });
    
    // Set admin claims immediately
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    
    // Save additional data to Realtime Database
    const lawFirmAdminRef = admin.database().ref(`law_firm_admin/${userRecord.uid}`);
    await lawFirmAdminRef.set({
      lawFirm: userData.lawFirm,
      phoneNumber: userData.phoneNumber,
      email: userData.email,
      operatingHours: userData.operatingHours,
      licenseNumber: userData.licenseNumber,
      officeAddress: userData.officeAddress,
      uid: userRecord.uid,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      // Add subscription fields
      subscriptionStatus: "active",
      isTrial: true,
      subscriptionEndDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days trial
    });
    
    // Return success
    res.status(201).json({ 
      message: 'Law firm admin registered successfully',
      uid: userRecord.uid 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
};