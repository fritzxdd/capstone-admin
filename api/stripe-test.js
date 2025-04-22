const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  try {
    console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
    console.log('STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 7));
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe key is not configured' });
    }
    
    // Try a simple Stripe API call
    const paymentMethods = await stripe.paymentMethods.list({ limit: 1 });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Stripe is working correctly',
      data: {
        count: paymentMethods.data.length
      }
    });
  } catch (error) {
    console.error('Stripe test error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      type: error.type,
      code: error.code
    });
  }
};