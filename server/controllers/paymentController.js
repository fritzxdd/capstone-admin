// server/controllers/paymentController.js
const admin = require('firebase-admin');
const db = admin.database();
const stripeConfig = require('../config/stripeConfig');

exports.createCheckoutSession = async (req, res) => {
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
      console.error('Missing required payment information');
      return res.status(400).json({ error: 'Missing required payment information' });
    }
    
    // Create checkout session using our robust stripe configuration
    const result = await stripeConfig.createCheckoutSession({
      amount,
      productName: planName,
      successUrl: success_url || `${process.env.CLIENT_URL || 'https://capstone-admin-beige.vercel.app'}/payment-success?payment_id={CHECKOUT_SESSION_ID}&plan=${planId}&amount=${amount}&status=success`,
      cancelUrl: cancel_url || `${process.env.CLIENT_URL || 'https://capstone-admin-beige.vercel.app'}/plans`,
      metadata: {
        planId,
        planName
      }
    });
    
    if (!result.success) {
      console.error('Stripe API error:', result.error);
      return res.status(500).json({ 
        error: 'Stripe API error', 
        details: result.error.message,
        code: result.error.code || result.error.type
      });
    }
    
    console.log('Stripe session created successfully:', result.session.id);
    
    // Return the session ID
    res.status(200).json({ id: result.session.id });
  } catch (error) {
    console.error('Server error in checkout process:', error);
    res.status(500).json({ error: 'Server error processing payment request' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { payment_id, userId, plan } = req.query;
    
    if (!payment_id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }
    
    // Retrieve session using robust stripe configuration
    const result = await stripeConfig.retrieveSession(payment_id);
    
    if (!result.success) {
      console.error('Stripe verification error:', result.error);
      return res.status(500).json({ 
        error: 'Stripe verification error', 
        details: result.error.message 
      });
    }
    
    const session = result.session;
    
    // If payment was successful and we have a userId, update subscription
    if (session.payment_status === 'paid' && userId && plan) {
      try {
        // Get plan details
        const plansRef = db.ref('plans');
        const plansSnapshot = await plansRef.once('value');
        const plans = plansSnapshot.val();
        
        const planData = plans && plans[plan] ? plans[plan] : null;
        
        if (planData) {
          // Calculate subscription end date
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + (planData.duration || 30));
          
          // Update user subscription data
          const userRef = db.ref(`law_firm_admin/${userId}`);
          await userRef.update({
            subscriptionStatus: 'active',
            subscriptionEndDate: endDate.getTime(),
            isTrial: false,
            currentPlan: plan,
            paymentId: payment_id,
            lastPaymentDate: startDate.getTime()
          });
          
          // Also create a subscription record
          const subscriptionRef = db.ref('subscriptions').push();
          await subscriptionRef.set({
            userId,
            planId: plan,
            startDate: startDate.getTime(),
            endDate: endDate.getTime(),
            status: 'active',
            isTrial: false,
            paymentId: payment_id,
            createdAt: Date.now()
          });
          
          // Update user record with subscription reference
          await userRef.update({
            currentSubscription: subscriptionRef.key
          });
          
          console.log(`Subscription updated successfully for user ${userId}, plan ${plan}`);
        }
      } catch (dbError) {
        console.error('Database update error:', dbError);
        // Continue with verification response even if DB update fails
      }
    }
    
    res.status(200).json({
      verified: session.payment_status === 'paid',
      session
    });
  } catch (error) {
    console.error('Server error in verification process:', error);
    res.status(500).json({ error: 'Server error during payment verification' });
  }
};