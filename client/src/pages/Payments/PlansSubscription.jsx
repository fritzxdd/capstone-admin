import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { auth, db } from "../../services/firebase";
import { ref, onValue, update } from "firebase/database";
import axios from "axios";
import SubscriptionStatus from "../../components/Subscription/SubscriptionStatus";
import Toast from "../../components/UI/Toast";
import "../../styles/index.css";
import { getApiBaseUrl } from '../../utils/apiConfig';

// Initialize Stripe (but don't reject the Promise if it fails)
const stripePromise = loadStripe("pk_test_51R1JB1FK88cwX0GIKPBVnKvk71rR4fEuOLZQkfgW814lspsx14jcUk61Is7sq6uS7IAHSrdHzOWDCsZPRgDj5YFi00kewOXwwe")
  .catch(err => {
    console.error("Stripe initialization error:", err);
    return null;
  });

// Payment method selection component
const PaymentMethodSelector = ({ selectedPlan, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const user = auth.currentUser;
  
  // Toast notification helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    
    // Clear toast after 5 seconds
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };
  
  // Enhanced Stripe Checkout Function for PlansSubscription.jsx

const handleStripeCheckout = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const stripe = await stripePromise;
    
    if (!stripe) {
      throw new Error("Stripe failed to initialize. Please try again later.");
    }
    
    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error("You must be logged in to make a purchase.");
    }
    
    // Calculate the origin URL for success/cancel redirects
    const origin = window.location.origin;
    
    // Build payment data with more detailed user information
    const paymentData = {
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      amount: selectedPlan.amount,
      success_url: `${origin}/payment-success?userId=${user.uid}&plan=${selectedPlan.id}`, 
      cancel_url: `${origin}/plans`,
      user_id: user.uid, // Add user ID for server-side processing
      metadata: {
        user_email: user.email,
        plan_duration: selectedPlan.duration
      }
    };
    
    console.log('Creating checkout session for plan:', paymentData);
    
    // Get the API base URL
    const apiBaseUrl = getApiBaseUrl();
    
    // Call your backend to create a Checkout Session
    const response = await axios.post(`${apiBaseUrl}/create-checkout-session`, paymentData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Stripe checkout session created:', response.data);
    
    // Store plan info in user data for confirmation after payment
    if (user && response.data && response.data.id) {
      try {
        // Update pending plan information in Firebase
        const userRef = ref(db, `law_firm_admin/${user.uid}`);
        await update(userRef, {
          pendingPlan: {
            id: selectedPlan.id,
            name: selectedPlan.name,
            duration: selectedPlan.duration,
            amount: selectedPlan.amount,
            checkoutSessionId: response.data.id,
            timestamp: Date.now()
          }
        });
        console.log("Pending plan data saved to user profile");
      } catch (dbError) {
        console.error("Failed to save pending plan data:", dbError);
        // Continue to Stripe checkout even if DB update fails
      }
    }
    
    // Redirect to Stripe Checkout
    console.log('Redirecting to Stripe checkout...');
    const result = await stripe.redirectToCheckout({
      sessionId: response.data.id,
    });
    
    if (result.error) {
      console.error('Stripe redirect error:', result.error);
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Payment error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Set error message based on context
    if (error.response?.status === 500) {
      setError("Payment service is currently unavailable. Please try again later.");
    } else {
      setError(error.message || 'Something went wrong. Please try again.');
    }
    
    showToast('Payment processing error. Please try again later.', 'error');
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
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="payment-methods">
        <button 
          className="payment-method-btn stripe-btn" 
          onClick={handleStripeCheckout}
          disabled={loading}
        >
          <div className="payment-method-icon">
            <img 
              src="https://cdn.jsdelivr.net/gh/stripe-samples/checkout-one-time-payments/client/html/images/stripe.svg" 
              alt="Stripe" 
            />
          </div>
          <div className="payment-method-text">
            <h3>Pay with Stripe</h3>
            <p>Secure checkout with credit card, debit card, and more</p>
          </div>
        </button>
      </div>
      
      {loading && <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="loading-message">Processing your request...</p>
      </div>}
      
      <div className="terms-note">
        By proceeding with payment, you agree to our Terms of Service and Privacy Policy.
      </div>
    </div>
  );
};

// Main PlansSubscription component
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

  // Toast notification helper
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

  // Function to fetch plans from backend
  const fetchPlans = async () => {
    setLoadingPlan(true);
    setFetchError(null);
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      console.log(`Fetching plans from: ${apiBaseUrl}/plans`);
      
      // For Vercel deployment, paths need to be relative
      const response = await fetch(`${apiBaseUrl}/plans`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch plans: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Filter out trial plan if already used or active subscription exists
      const filteredPlans = data.filter(plan => {
        // Skip trial plan if user already used it or has active subscription
        if (plan.id === 'plan_trial') {
          return subscriptionData.status === 'none'; // Only show trial if no subscription
        }
        return true;
      });
      
      setPlans(filteredPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      setFetchError("Unable to load subscription plans. Using default plans instead.");
      
      // Fallback to static plans if fetching fails
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
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  const handleCancelPayment = () => {
    setSelectedPlan(null);
  };

  return (
    <div className="plans-container">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      {loadingPlan ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-message">Loading plans...</p>
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
                  <p className="price">{plan.price} / period</p>
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
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default PlansSubscription;