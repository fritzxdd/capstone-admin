import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { auth, db } from "../../services/firebase";
import { ref, onValue, update } from "firebase/database";
import axios from "axios";
import SubscriptionStatus from "../../components/Subscription/SubscriptionStatus";
import "../../styles/index.css";
import { getApiBaseUrl, getAppDomain } from '../utils/apiConfig';

// Using your existing Stripe key from the document
const stripePromise = loadStripe("pk_test_51R1JB1FK88cwX0GIKPBVnKvk71rR4fEuOLZQkfgW814lspsx14jcUk61Is7sq6uS7IAHSrdHzOWDCsZPRgDj5YFi00kewOXwwe");

// Payment method selection component
const PaymentMethodSelector = ({ selectedPlan, onCancel, showToast }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const user = auth.currentUser;
  
  const handleStripeCheckout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const stripe = await stripePromise;
      
      console.log('Creating checkout session for plan:', selectedPlan);
      
      // Call your backend to create a Checkout Session
      const response = await axios.post(`${getApiBaseUrl()}/subscriptions`, {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.amount,
        success_url: `http://localhost:5174/payment-success?userId=${user?.uid}`, 
        cancel_url: 'http://localhost:5174/plans'
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok && !response.data) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const session = response.data;
      console.log('Received session:', session);
      
      // Store plan info in user data for confirmation after payment
      if (user) {
        await update(ref(db, `law_firm_admin/${user.uid}`), {
          pendingPlan: {
            id: selectedPlan.id,
            name: selectedPlan.name,
            duration: selectedPlan.duration,
            amount: selectedPlan.amount,
            checkoutSessionId: session.id,
            timestamp: Date.now()
          }
        });
      }
      
      // Redirect to Stripe Checkout
      console.log('Redirecting to Stripe checkout...');
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });
      
      if (result.error) {
        console.error('Stripe redirect error:', result.error);
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Detailed error:', error);
      setError(error.message || 'Something went wrong. Please try again.');
      showToast && showToast('Payment processing error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="payment-method-container">
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
          </div>
        </button>
      </div>
      
      {loading && <div className="loading">Processing your request...</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

const PlansSubscription = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [plans, setPlans] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState({
    status: 'none',
    endDate: null,
    isTrial: false,
    remainingDays: 0
  });

  // Check for message in location state (from trial expiration redirect)
  useEffect(() => {
    if (location.state?.message) {
      showToast && showToast(location.state.message, 'warning');
      
      // Clear the message after showing it
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate, showToast]);

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
      // Use dynamic API base URL instead of hardcoded localhost
      const apiBaseUrl = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${apiBaseUrl}/plans`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch plans");
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
      setFetchError("");
      
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

  const handleSelectPlan = async (plan) => {
    setLoadingPlan(true);
    
    try {
      // Use dynamic API base URL instead of hardcoded localhost
      const apiBaseUrl = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${apiBaseUrl}/plans`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch plans");
      }
      
      const updatedPlan = await response.json();
      setSelectedPlan(updatedPlan);
    } catch (error) {
      console.error("Error fetching plan details:", error);
      // If fetch fails, use the plan data we already have
      setSelectedPlan(plan);
      showToast && showToast("Couldn't fetch the latest plan details. Using cached data.", "warning");
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleCancelPayment = () => {
    setSelectedPlan(null);
  };

  return (
    <div className="plans-container">
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