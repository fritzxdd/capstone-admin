import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, update, get } from "firebase/database";
import "../../styles/index.css";

// Simple check mark SVG component
const CheckMarkIcon = () => (
  <div className="check-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  </div>
);

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [planDetails, setPlanDetails] = useState({
    name: "Subscription Plan",
    amount: 0
  });
  
  // Extract query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const paymentId = queryParams.get('payment_id');
    const plan = queryParams.get('plan');
    const userId = queryParams.get('userId') || auth.currentUser?.uid;
    
    console.log("Payment Success params:", { paymentId, plan, userId });
    
    if (paymentId && plan && userId) {
      // Update subscription status in Firebase
      updateSubscriptionStatus(userId, plan, paymentId);
      
      // Get plan details if possible
      fetchPlanDetails(plan);
    } else {
      setLoading(false);
    }
  }, [location]);
  
  // Update user's subscription status
  const updateSubscriptionStatus = async (userId, planId, paymentId) => {
    try {
      if (!userId) return;
      
      // Get plan duration
      let duration = 30; // default 1 month
      if (planId === 'plan_6months') duration = 180;
      if (planId === 'plan_1year') duration = 365;
      
      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);
      
      // Update user data
      const userRef = ref(db, `law_firm_admin/${userId}`);
      await update(userRef, {
        subscriptionStatus: 'active',
        subscriptionEndDate: endDate.getTime(),
        isTrial: false,
        currentPlan: planId,
        paymentId: paymentId,
        lastPaymentDate: startDate.getTime()
      });
      
      console.log("Updated subscription status in Firebase");
    } catch (error) {
      console.error("Error updating subscription:", error);
      setError("There was an issue updating your subscription status. Please contact support.");
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch plan details if available
  const fetchPlanDetails = async (planId) => {
    try {
      // Map plan IDs to names
      const planNames = {
        'plan_1month': '1 Month Plan',
        'plan_6months': '6 Months Plan',
        'plan_1year': '1 Year Plan'
      };
      
      // Map plan IDs to amounts
      const planAmounts = {
        'plan_1month': '₱500',
        'plan_6months': '₱2,500',
        'plan_1year': '₱4,800'
      };
      
      setPlanDetails({
        name: planNames[planId] || 'Subscription Plan',
        amount: planAmounts[planId] || ''
      });
    } catch (error) {
      console.error("Error fetching plan details:", error);
    }
  };
  
  const handleReturnHome = () => {
    navigate("/");
  };
  
  if (loading) {
    return (
      <div className="success-page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-message">Finalizing your subscription...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="success-page-container">
      <div className="success-card">
        {error ? (
          <>
            <h1 className="error-title">Something went wrong</h1>
            <p className="error-message">{error}</p>
            <button className="primary-button" onClick={handleReturnHome}>
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <div className="success-icon">
              <CheckMarkIcon />
            </div>
            
            <h1 className="success-title">Payment Successful!</h1>
            
            <div className="success-message">
              <p>Thank you for your subscription. Your payment has been processed successfully.</p>
            </div>
            
            <div className="order-details">
              <h2>Subscription Details</h2>
              <div className="detail-row">
                <span className="detail-label">Plan:</span>
                <span className="detail-value">{planDetails.name}</span>
              </div>
              {planDetails.amount && (
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value">{planDetails.amount}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value status-success">Active</span>
              </div>
            </div>
            
            <div className="next-steps">
              <h3>What's Next?</h3>
              <ul>
                <li>Your subscription is now active.</li>
                <li>You can access all premium features from your dashboard.</li>
              </ul>
            </div>
            
            <div className="action-buttons">
              <button className="primary-button" onClick={handleReturnHome}>
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;