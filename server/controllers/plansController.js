// controllers/plansController.js
exports.getAllPlans = async (req, res) => {
    try {
      // Return subscription plans
      const plans = [
        {
          id: "plan_1month",
          name: "1 Month Plan",
          price: "₱500",
          amount: 500,
          description: "Access premium features for one month."
        },
        {
          id: "plan_6months",
          name: "6 Months Plan",
          price: "₱2,500",
          amount: 2500,
          description: "Enjoy premium features for six months at a discounted rate."
        },
        {
          id: "plan_1year",
          name: "1 Year Plan",
          price: "₱4,800",
          amount: 4800,
          description: "Get the best value with a full-year subscription."
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
        "plan_1month": {
          id: "plan_1month",
          name: "1 Month Plan",
          price: "₱500",
          amount: 500,
          description: "Access premium features for one month."
        },
        "plan_6months": {
          id: "plan_6months",
          name: "6 Months Plan",
          price: "₱2,500",
          amount: 2500,
          description: "Enjoy premium features for six months at a discounted rate."
        },
        "plan_1year": {
          id: "plan_1year",
          name: "1 Year Plan",
          price: "₱4,800",
          amount: 4800,
          description: "Get the best value with a full-year subscription."
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