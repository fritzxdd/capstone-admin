// controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  try {
    // Log incoming request
    console.log('Creating checkout session with payload:', req.body);
    
    const { planId, planName, amount, success_url, cancel_url } = req.body;
    
    // Validate required fields
    if (!planName || !amount) {
      console.error('Missing required fields:', { planName, amount });
      return res.status(400).json({ error: 'Plan name and amount are required' });
    }
    
    // Use properly formatted success and cancel URLs
    const successUrl = success_url || `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = cancel_url || `${process.env.CLIENT_URL}/plans`;
    
    console.log('Creating Stripe checkout session with:', {
      planName,
      amount,
      successUrl,
      cancelUrl
    });
    
    // Create Stripe checkout session with test mode settings
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'php',
            product_data: {
              name: planName,
            },
            unit_amount: amount * 100, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    
    console.log('Session created successfully:', {
      sessionId: session.id,
      paymentStatus: session.payment_status
    });
    
    // Return the session ID
    res.json({ id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    console.error('Error details:', error);
    
    // Send a more specific error message to the client
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message,
      type: error.type
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { payment_id } = req.query;
    
    if (!payment_id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }
    
    console.log('Verifying payment with ID:', payment_id);
    const session = await stripe.checkout.sessions.retrieve(payment_id);
    
    console.log('Session retrieved:', {
      id: session.id,
      status: session.payment_status
    });
    
    res.status(200).json({
      verified: session.payment_status === 'paid',
      session
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message });
  }
};