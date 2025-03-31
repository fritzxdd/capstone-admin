// middleware/checkSubscription.js
const admin = require('firebase-admin');
const db = admin.database();

/**
 * Middleware to check if a user has an active subscription
 */
const checkSubscription = async (req, res, next) => {
  try {
    // Get the user ID from auth
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    const userId = decodedToken.uid;
    
    // Get user subscription data
    const userSnapshot = await db.ref(`law_firm_admin/${userId}`).once('value');
    const userData = userSnapshot.val();
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has active subscription
    const now = Date.now();
    const subscriptionEndDate = userData.subscriptionEndDate || 0;
    const subscriptionStatus = userData.subscriptionStatus || 'none';
    
    if (subscriptionStatus !== 'active' || subscriptionEndDate < now) {
      // Update subscription status if it's expired
      if (subscriptionStatus === 'active' && subscriptionEndDate < now) {
        await db.ref(`law_firm_admin/${userId}`).update({
          subscriptionStatus: 'expired'
        });
        
        // Also update the subscription record if exists
        if (userData.currentSubscription) {
          await db.ref(`subscriptions/${userData.currentSubscription}`).update({
            status: 'expired'
          });
        }
      }
      
      return res.status(403).json({ 
        error: 'Subscription required',
        subscriptionStatus: subscriptionEndDate < now ? 'expired' : subscriptionStatus,
        subscriptionEndDate,
        message: 'Your trial or subscription has expired. Please upgrade to continue using all features.'
      });
    }
    
    // Add subscription info to request for use in route handlers
    req.subscription = {
      status: subscriptionStatus,
      endDate: subscriptionEndDate,
      isTrial: userData.isTrial || false,
      remainingDays: Math.ceil((subscriptionEndDate - now) / (1000 * 60 * 60 * 24))
    };
    
    // User has active subscription, proceed
    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = checkSubscription;