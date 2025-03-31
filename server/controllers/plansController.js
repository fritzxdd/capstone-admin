// controllers/plansController.js
exports.getAllPlans = async (req, res) => {
  try {
    // Return subscription plans with free trial option
    const plans = [
      {
        id: "plan_trial",
        name: "Free Trial",
        price: "Free",
        amount: 0,
        description: "Access all premium features for one month. No credit card required.",
        duration: 30, // days
        isTrial: true
      },
      {
        id: "plan_1month",
        name: "1 Month Plan",
        price: "₱500",
        amount: 500,
        description: "Access premium features for one month.",
        duration: 30, // days
        isTrial: false
      },
      {
        id: "plan_6months",
        name: "6 Months Plan",
        price: "₱2,500",
        amount: 2500,
        description: "Enjoy premium features for six months at a discounted rate.",
        duration: 180, // days
        isTrial: false
      },
      {
        id: "plan_1year",
        name: "1 Year Plan",
        price: "₱4,800",
        amount: 4800,
        description: "Get the best value with a full-year subscription.",
        duration: 365, // days
        isTrial: false
      }
    ];
    
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    // In a real app, get this from a database
    const plans = {
      "plan_trial": {
        id: "plan_trial",
        name: "Free Trial",
        price: "Free",
        amount: 0,
        description: "Access all premium features for one month. No credit card required.",
        duration: 30, // days
        isTrial: true
      },
      "plan_1month": {
        id: "plan_1month",
        name: "1 Month Plan",
        price: "₱500",
        amount: 500,
        description: "Access premium features for one month.",
        duration: 30, // days
        isTrial: false
      },
      "plan_6months": {
        id: "plan_6months",
        name: "6 Months Plan",
        price: "₱2,500",
        amount: 2500,
        description: "Enjoy premium features for six months at a discounted rate.",
        duration: 180, // days
        isTrial: false
      },
      "plan_1year": {
        id: "plan_1year",
        name: "1 Year Plan",
        price: "₱4,800",
        amount: 4800,
        description: "Get the best value with a full-year subscription.",
        duration: 365, // days
        isTrial: false
      }
    };
    
    const plan = plans[id];
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};