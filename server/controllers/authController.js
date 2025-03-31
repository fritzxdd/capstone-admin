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

exports.register = async (req, res) => {
  try {
    const { uid, lawFirm, email, phoneNumber, operatingHours, licenseNumber, officeAddress } = req.body;
    
    if (!uid || !lawFirm || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Current date for the subscription
    const startDate = Date.now();
    
    // Calculate trial end date (30 days from now)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);
    
    // Create law firm admin record with trial subscription
    const adminData = {
      uid,
      lawFirm,
      email,
      phoneNumber,
      operatingHours,
      licenseNumber,
      officeAddress,
      createdAt: startDate,
      subscriptionStatus: 'active', 
      subscriptionEndDate: endDate.getTime(),
      isTrial: true
    };
    
    // Save admin data
    await db.ref(`law_firm_admin/${uid}`).set(adminData);
    
    // Create subscription record
    try {
      // Create subscription using the subscription service
      const subscriptionData = {
        userId: uid,
        planId: 'plan_trial',
        startDate
      };
      
      // Using axios to make an internal API call
      // In a production environment, consider direct function call instead
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const subscriptionResponse = await axios.post(
        `${baseUrl}/api/subscriptions`, 
        subscriptionData
      );
      
      // Update admin record with subscription ID
      if (subscriptionResponse.data && subscriptionResponse.data.id) {
        await db.ref(`law_firm_admin/${uid}`).update({
          currentSubscription: subscriptionResponse.data.id
        });
      }
    } catch (subError) {
      console.error('Error creating trial subscription:', subError);
      // Continue with registration even if subscription creation fails
      // We'll handle this edge case on the client side
    }
    
    res.status(201).json({
      message: 'Registration successful',
      trialEndDate: endDate.getTime(),
      isTrial: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
};