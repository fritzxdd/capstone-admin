// server/controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  try {
    console.log('Create checkout session request received:', req.body);
    
    const { planName, amount } = req.body;
    
    // Basic validation
    if (!planName || !amount) {
      console.error('Missing required parameters:', req.body);
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Get success and cancel URLs with fallbacks
    const success_url = req.body.success_url || `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success`;
    const cancel_url = req.body.cancel_url || `${process.env.CLIENT_URL || 'http://localhost:5173'}/plans`;
    
    // Log the Stripe key (first 8 chars only for security)
    const secretKeyPrefix = process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 8) : 'undefined';
    console.log(`Using Stripe key beginning with: ${secretKeyPrefix}...`);

    console.log('Creating session with params:', {
      planName,
      amountInCents: amount * 100,
      success_url,
      cancel_url
    });
    
    // Create checkout session
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
      success_url,
      cancel_url,
    });
    
    console.log('Stripe session created successfully:', {
      sessionId: session.id,
      status: session.status
    });
    
    // Return session ID to client
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    
    // Specific error handling
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid request to Stripe',
        details: error.message
      });
    }
    
    if (error.type === 'StripeAPIError') {
      return res.status(502).json({ 
        error: 'Error communicating with Stripe',
        details: error.message 
      });
    }
    
    if (error.type === 'StripeAuthenticationError') {
      return res.status(401).json({ 
        error: 'Authentication with Stripe failed',
        details: 'Invalid API key or access to resource denied'
      });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { payment_id } = req.query;
    
    if (!payment_id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }
    
    console.log('Verifying payment ID:', payment_id);
    const session = await stripe.checkout.sessions.retrieve(payment_id);
    
    console.log('Payment verification result:', {
      id: session.id,
      status: session.payment_status
    });
    
    res.status(200).json({
      verified: session.payment_status === 'paid',
      session
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      message: error.message 
    });
  }
};