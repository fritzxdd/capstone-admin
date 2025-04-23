import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, update, set, get } from "firebase/database";
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
      console.warn("Missing required parameters:", { paymentId, plan, userId });
      setLoading(false);
    }
  }, [location]);
  
// Enhanced updateSubscriptionStatus function for PaymentSuccess.jsx
const updateSubscriptionStatus = async (userId, planId, paymentId) => {
  try {
    console.log("Updating subscription status for:", { userId, planId, paymentId });
    
    if (!userId) {
      console.error("No userId provided for subscription update");
      setError("User identification error. Please contact support.");
      setLoading(false);
      return;
    }
    
    // First, check if there's an existing subscription with days remaining
    const userRef = ref(db, `law_firm_admin/${userId}`);
    const userSnapshot = await get(userRef);
    
    let additionalDays = 0;
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      
      // Check if they have an active subscription with remaining days
      if (userData.subscriptionStatus === 'active') {
        const now = Date.now();
        const currentEndDate = userData.subscriptionEndDate || 0;
        
        // If there are days remaining, calculate them
        if (currentEndDate > now) {
          additionalDays = Math.ceil((currentEndDate - now) / (1000 * 60 * 60 * 24));
          console.log(`Found ${additionalDays} days remaining on current subscription`);
        }
      }
    }
    
    // Get plan duration
    let planDuration = 30; // default 1 month
    if (planId === 'plan_6months') planDuration = 180;
    if (planId === 'plan_1year') planDuration = 365;
    
    // Add the remaining days to the new subscription
    const totalDuration = planDuration + additionalDays;
    
    console.log(`Base plan duration: ${planDuration} days`);
    console.log(`Additional days from existing subscription: ${additionalDays} days`);
    console.log(`Total duration: ${totalDuration} days`);
    
    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalDuration);
    
    console.log(`Subscription period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Create subscription data object
    const subscriptionData = {
      subscriptionStatus: 'active',
      subscriptionEndDate: endDate.getTime(),
      isTrial: false,
      trialEnded: true,
      trialUpgradedTo: planId,
      currentPlan: planId,
      paymentId: paymentId,
      lastPaymentDate: startDate.getTime(),
      additionalDays: additionalDays, // Store this for reference
      totalDuration: totalDuration
    };
    
    console.log("Updating user data in Firebase:", subscriptionData);
    
    // Update user data
    await update(userRef, subscriptionData);
    
    // Also create a subscription record for tracking
    try {
      const subscriptionRef = ref(db, `subscriptions/${paymentId}`);
      await set(subscriptionRef, {
        userId,
        planId,
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        status: 'active',
        additionalDays: additionalDays,
        paymentId,
        createdAt: Date.now()
      });
      console.log("Created subscription record");
      
      // Update the admin record with subscription ID reference
      await update(userRef, {
        currentSubscription: paymentId
      });
      
    } catch (subError) {
      console.error("Error creating subscription record:", subError);
      // Continue even if this fails
    }
    
    console.log("Subscription update completed successfully");
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