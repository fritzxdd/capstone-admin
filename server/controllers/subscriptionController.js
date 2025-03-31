// controllers/subscriptionController.js
const admin = require('firebase-admin');
const db = admin.database();

exports.createSubscription = async (req, res) => {
  try {
    const { userId, planId, startDate = Date.now() } = req.body;
    
    if (!userId || !planId) {
      return res.status(400).json({ error: 'User ID and Plan ID are required' });
    }
    
    // Get plan details to determine duration and trial status
    let planDetails;
    try {
      // For a real implementation, fetch from database
      // This is a simple in-memory version for the example
      const plans = {
        "plan_trial": {
          id: "plan_trial",
          name: "Free Trial",
          price: "Free",
          amount: 0,
          duration: 30, // days
          isTrial: true
        },
        "plan_1month": {
          duration: 30, // days
          isTrial: false
        },
        "plan_6months": {
          duration: 180, // days
          isTrial: false
        },
        "plan_1year": {
          duration: 365, // days
          isTrial: false
        }
      };
      
      planDetails = plans[planId];
      
      if (!planDetails) {
        return res.status(404).json({ error: 'Plan not found' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error fetching plan details' });
    }
    
    // Calculate end date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + planDetails.duration);
    
    // Create the subscription
    const subscriptionData = {
      userId,
      planId,
      startDate,
      endDate: endDate.getTime(),
      status: 'active',
      isTrial: planDetails.isTrial,
      createdAt: Date.now()
    };
    
    // Save to Firebase
    const subscriptionRef = db.ref('subscriptions').push();
    await subscriptionRef.set(subscriptionData);
    
    // Update user with subscription info
    await db.ref(`law_firm_admin/${userId}`).update({
      currentSubscription: subscriptionRef.key,
      subscriptionStatus: 'active',
      subscriptionEndDate: endDate.getTime(),
      isTrial: planDetails.isTrial
    });
    
    res.status(201).json({
      id: subscriptionRef.key,
      ...subscriptionData
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get user to find current subscription
    const userSnapshot = await db.ref(`law_firm_admin/${userId}`).once('value');
    const userData = userSnapshot.val();
    
    if (!userData || !userData.currentSubscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    // Get subscription details
    const subscriptionSnapshot = await db.ref(`subscriptions/${userData.currentSubscription}`).once('value');
    const subscription = subscriptionSnapshot.val();
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Check if subscription has expired
    const now = Date.now();
    if (subscription.endDate < now && subscription.status === 'active') {
      // Update subscription status to expired
      await db.ref(`subscriptions/${userData.currentSubscription}`).update({
        status: 'expired'
      });
      
      // Update user record
      await db.ref(`law_firm_admin/${userId}`).update({
        subscriptionStatus: 'expired'
      });
      
      subscription.status = 'expired';
    }
    
    res.status(200).json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get user data
    const userSnapshot = await db.ref(`law_firm_admin/${userId}`).once('value');
    const userData = userSnapshot.val();
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check subscription status
    const subscriptionStatus = userData.subscriptionStatus || 'none';
    const isTrial = userData.isTrial || false;
    const subscriptionEndDate = userData.subscriptionEndDate || 0;
    
    // Check if subscription has expired
    const now = Date.now();
    let status = subscriptionStatus;
    
    if (subscriptionStatus === 'active' && subscriptionEndDate < now) {
      // Update user status to expired
      await db.ref(`law_firm_admin/${userId}`).update({
        subscriptionStatus: 'expired'
      });
      
      // If there's a current subscription, also update it
      if (userData.currentSubscription) {
        await db.ref(`subscriptions/${userData.currentSubscription}`).update({
          status: 'expired'
        });
      }
      
      status = 'expired';
    }
    
    // Calculate remaining days
    const remainingDays = subscriptionEndDate > now 
      ? Math.ceil((subscriptionEndDate - now) / (1000 * 60 * 60 * 24)) 
      : 0;
    
    res.status(200).json({
      status,
      isTrial,
      subscriptionEndDate,
      remainingDays,
      hasAccess: status === 'active'
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ error: error.message });
  }
};