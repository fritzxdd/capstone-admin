import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { auth, db } from "../../services/firebase";
import { ref, onValue, update } from "firebase/database";
import axios from "axios";
import SubscriptionStatus from "../../components/Subscription/SubscriptionStatus";
import "../../styles/index.css";
import { getApiBaseUrl } from '../../utils/apiConfig';
import Toast from "../../components/UI/Toast";

// Initialize Stripe with your publishable key - ensure this is the test mode key
const stripePromise = loadStripe("pk_test_51R1JB1FK88cwX0GIKPBVnKvk71rR4fEuOLZQkfgW814lspsx14jcUk61Is7sq6uS7IAHSrdHzOWDCsZPRgDj5YFi00kewOXwwe");

// Payment method selection component
const PaymentMethodSelector = ({ selectedPlan, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const user = auth.currentUser;
  
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    
    // Clear toast after 5 seconds
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };
  
  const handleStripeCheckout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Log to confirm we're in the handler
      console.log('Starting Stripe checkout process...');
      
      // Load Stripe
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }
      
      console.log('Stripe loaded successfully');
      console.log('Creating checkout session for plan:', selectedPlan);
      
      // Create a direct payload for the checkout session
      const payload = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.amount,
        success_url: `${window.location.origin}/payment-success?userId=${user?.uid}`, 
        cancel_url: `${window.location.origin}/plans`
      };
      
      console.log('Checkout payload:', payload);
      
      // Make the API call
      console.log('Calling create-checkout-session endpoint...');
      const response = await axios.post(`${getApiBaseUrl()}/create-checkout-session`, payload);
      
      console.log('Checkout session response:', response);
      
      // Verify the response has session ID
      if (!response.data || !response.data.id) {
        console.error('Invalid response:', response.data);
        throw new Error('Invalid response from server. Session ID is missing.');
      }
      
      const sessionId = response.data.id;
      console.log('Session ID received:', sessionId);
      
      // Redirect to Stripe checkout
      console.log('Redirecting to Stripe checkout with session ID:', sessionId);
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        console.error('Stripe redirect error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Log detailed error information
      if (error.response) {
        // The request was made, but the server responded with an error
        console.error('Server error details:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something else caused the error
        console.error('Error details:', error.message);
      }
      
      // Set a more user-friendly error message
      setError('Unable to process payment at this time. Please try again later.');
      showToast('Payment processing error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="payment-method-container">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <h2>Choose Payment Method</h2>
      <div className="selected-plan-summary">
        <h3>Selected Plan: {selectedPlan.name}</h3>
        <p>Price: {selectedPlan.price}</p>
        <p>{selectedPlan.description}</p>
        <button className="change-plan-btn" onClick={onCancel}>Change Plan</button>
      </div>
      
      <div className="payment-methods">
        <button 
          className="payment-method-btn stripe-btn" 
          onClick={handleStripeCheckout}
          disabled={loading}
        >
          <div className="payment-method-icon">
            <img src="https://cdn.jsdelivr.net/gh/stripe-samples/checkout-one-time-payments/client/html/images/stripe.svg" alt="Stripe" />
          </div>
          <div className="payment-method-text">
            <h3>Pay with Stripe</h3>
            <p>Secure checkout with credit card, debit card, and more</p>
            <p><small>Test mode is active - use card number 4242 4242 4242 4242</small></p>
          </div>
        </button>
      </div>
      
      {loading && <div className="loading">Processing your request...</div>}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span> {error}
        </div>
      )}
      
      <div className="test-mode-info" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #e9ecef' }}>
        <h4>Test Mode Information</h4>
        <p>This checkout is in test mode. Use the following test card details:</p>
        <ul style={{ listStyleType: 'none', padding: '0' }}>
          <li>Card Number: <code>4242 4242 4242 4242</code></li>
          <li>Expiration: Any future date (e.g., <code>12/25</code>)</li>
          <li>CVC: Any 3 digits (e.g., <code>123</code>)</li>
          <li>ZIP: Any 5 digits (e.g., <code>12345</code>)</li>
        </ul>
      </div>
    </div>
  );
};

const PlansSubscription = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [plans, setPlans] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [toast, setToast] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState({
    status: 'none',
    endDate: null,
    isTrial: false,
    remainingDays: 0
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    
    // Clear toast after 5 seconds
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Check for message in location state (from trial expiration redirect)
  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, 'warning');
      
      // Clear the message after showing it
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Fetch user subscription status
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    const userRef = ref(db, `law_firm_admin/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Calculate subscription status
        const now = Date.now();
        const endDate = userData.subscriptionEndDate || 0;
        const status = userData.subscriptionStatus || 'none';
        const isTrial = userData.isTrial || false;
        
        // Calculate remaining days
        const remainingDays = endDate > now
          ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
          : 0;
        
        // Update subscription data
        setSubscriptionData({
          status: endDate < now && status === 'active' ? 'expired' : status,
          endDate,
          isTrial,
          remainingDays
        });
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Fetch plans when component mounts
  useEffect(() => {
    fetchPlans();
  }, []);

  // Function to fetch plans
  const fetchPlans = async () => {
    setLoadingPlan(true);
    setFetchError(null);
    
    try {
      // First try to get plans from the server
      try {
        const response = await axios.get(`${getApiBaseUrl()}/plans`);
        
        if (response.data && Array.isArray(response.data)) {
          // Filter out trial plan if already used or active subscription exists
          const filteredPlans = response.data.filter(plan => {
            // Skip trial plan if user already used it or has active subscription
            if (plan.id === 'plan_trial') {
              return subscriptionData.status === 'none'; // Only show trial if no subscription
            }
            return true;
          });
          
          setPlans(filteredPlans);
          setLoadingPlan(false);
          return;
        }
      } catch (apiError) {
        console.error("Error fetching plans from API:", apiError);
        // Continue to fallback
      }
      
      // Fallback to static plans if fetching fails
      console.log("Using fallback static plans");
      setPlans([
        {
          id: "plan_1month",
          name: "1 Month Plan",
          price: "₱500",
          amount: 500,
          duration: 30,
          description: "Access premium features for one month.",
        },
        {
          id: "plan_6months",
          name: "6 Months Plan",
          price: "₱2,500",
          amount: 2500,
          duration: 180,
          description: "Enjoy premium features for six months at a discounted rate.",
        },
        {
          id: "plan_1year",
          name: "1 Year Plan",
          price: "₱4,800",
          amount: 4800,
          duration: 365,
          description: "Get the best value with a full-year subscription.",
        },
      ]);
    } catch (error) {
      console.error("Error in plans fallback:", error);
      setFetchError("Unable to load subscription plans. Please try again later.");
      showToast("Error loading plans. Please try again later.", "error");
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSelectPlan = (plan) => {
    console.log("Selected plan:", plan);
    setSelectedPlan(plan);
  };

  const handleCancelPayment = () => {
    setSelectedPlan(null);
  };

  return (
    <div className="plans-container">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      {loadingPlan ? (
        <div className="loading-container">
          <p>Loading plans...</p>
        </div>
      ) : !selectedPlan ? (
        <>
          <h1 className="title">Plans & Subscription</h1>
          
          {/* Show current subscription status */}
          <SubscriptionStatus />
          
          {fetchError && <div className="error-message">{fetchError}</div>}
          
          {/* Trial expiration message if applicable */}
          {subscriptionData.status === 'expired' && subscriptionData.isTrial && (
            <div className="expiry-notice">
              <h3>Your Free Trial Has Expired</h3>
              <p>Your 30-day free trial has ended. Choose a subscription plan below to continue enjoying all features.</p>
            </div>
          )}
          
          <div className="plans-grid">
            {plans.map((plan, index) => {
              // Determine if this is the recommended plan
              const isRecommended = index === plans.length - 1 || 
                (subscriptionData.status === 'expired' && index === 0);
              
              return (
                <div 
                  key={plan.id || index} 
                  className={`plan-card ${isRecommended ? 'recommended' : ''}`}
                >
                  <span className="tag">
                    {isRecommended ? "Best Value" : index === 0 ? "Basic" : "Popular"}
                  </span>
                  <h2>{plan.name}</h2>
                  <p className="price">{plan.price}</p>
                  <p className="description">{plan.description}</p>
                  <button 
                    className="subscribe-btn" 
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {plan.isTrial ? "Start Free Trial" : "Choose Plan"}
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* FAQ Section */}
          <div className="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-item">
              <h3>What happens after my free trial ends?</h3>
              <p>After your 30-day free trial expires, you'll need to select a subscription plan to continue using all features. Basic functionality will remain accessible, but premium features will be restricted.</p>
            </div>
            <div className="faq-item">
              <h3>Can I cancel my subscription?</h3>
              <p>Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.</p>
            </div>
            <div className="faq-item">
              <h3>How do I upgrade my plan?</h3>
              <p>You can upgrade your plan at any time by visiting this page and selecting a new plan. Your current subscription will be prorated towards the new one.</p>
            </div>
          </div>
        </>
      ) : (
        <PaymentMethodSelector
          selectedPlan={selectedPlan}
          onCancel={handleCancelPayment}
        />
      )}
    </div>
  );
};

export default PlansSubscription;