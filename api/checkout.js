// api/checkout.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { amount, name } = req.body;
    
    if (!amount || !name) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'php',
            product_data: {
              name: name,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'https://capstone-admin-beige.vercel.app'}/payment-success`,
      cancel_url: `${req.headers.origin || 'https://capstone-admin-beige.vercel.app'}/plans`,
    });
    
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ 
      error: 'Payment processing error',
      message: error.message,
      type: error.type,
      code: error.code
    });
  }
};