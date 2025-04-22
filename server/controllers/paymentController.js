// server/controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    
    // Make sure Stripe secret key is properly set
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return res.status(500).json({ error: 'Payment system not properly configured' });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'php',
            product_data: {
              name: planName,
            },
            unit_amount: amount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || `${process.env.CLIENT_URL || 'https://capstone-admin-beige.vercel.app'}/payment-success?payment_id={CHECKOUT_SESSION_ID}&plan=${planName}&amount=${amount}&status=success`,
      cancel_url: cancel_url || `${process.env.CLIENT_URL || 'https://capstone-admin-beige.vercel.app'}/plans`,
    });
    
    console.log('Stripe session created successfully:', session.id);
    
    // Return the session ID
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    if (error.type) {
      console.error('Stripe error type:', error.type);
    }
    res.status(500).json({ error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { payment_id } = req.query;
    
    if (!payment_id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }
    
    const session = await stripe.checkout.sessions.retrieve(payment_id);
    
    res.status(200).json({
      verified: session.payment_status === 'paid',
      session
    });
  } catch (error) {
    console.error('Verification error:', error.message);
    res.status(500).json({ error: error.message });
  }
};