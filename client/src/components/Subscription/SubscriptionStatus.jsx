import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/firebase';
import { getSubscriptionStatus, calculateRemainingDays } from '../../utils/FirebaseHelper';
import '../../styles/index.css';

const SubscriptionStatus = () => {
  const [subscriptionData, setSubscriptionData] = useState({
    status: 'loading',
    endDate: null,
    isTrial: false,
    remainingDays: 0,
    planName: ''
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const status = await getSubscriptionStatus(user.uid);
        setSubscriptionData(status);
      } catch (error) {
        console.error("Error fetching subscription status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionStatus();

    // Add a periodic refresh to keep remaining days updated
    const intervalId = setInterval(fetchSubscriptionStatus, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, []);

  const handleUpgrade = () => {
    navigate('/plans');
  };

  if (loading) {
    return (
      <div className="subscription-status-card skeleton">
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
      </div>
    );
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle different subscription states
  const renderSubscriptionContent = () => {
    const { status, isTrial, remainingDays, endDate, planName } = subscriptionData;

    // Paid subscription
    if (status === 'active' && !isTrial) {
      return (
        <>
          <div className="subscription-info">
            <h3>Premium Subscription Active</h3>
            <p className="subscription-detail">
              <span className="detail-label">Plan:</span>
              <span className="detail-value">{planName}</span>
            </p>
            <p className="subscription-detail">
              <span className="detail-label">Expires:</span>
              <span className="detail-value">{formatDate(endDate)}</span>
            </p>
            <p className="subscription-detail">
              <span className="detail-label">Remaining:</span>
              <span className="detail-value highlight">{remainingDays} days</span>
            </p>
          </div>
          <button 
            className="subscription-cta secondary" 
            onClick={handleUpgrade}
          >
            Manage Subscription
          </button>
        </>
      );
    }
    
    // Active trial
    if (status === 'active' && isTrial) {
      return (
        <>
          <div className="subscription-info">
            <h3>Free Trial Active</h3>
            <p className="subscription-detail">
              <span className="detail-label">Expires:</span>
              <span className="detail-value">{formatDate(endDate)}</span>
            </p>
            <p className="subscription-detail">
              <span className="detail-label">Remaining:</span>
              <span className="detail-value highlight">{remainingDays} days</span>
            </p>
            <p className="subscription-message">
              Enjoy full access to all features during your trial period.
            </p>
          </div>
          <button 
            className="subscription-cta" 
            onClick={handleUpgrade}
          >
            Upgrade Now
          </button>
        </>
      );
    }
    
    // Expired subscription/trial
    if (status === 'expired') {
      return (
        <>
          <div className="subscription-info expired">
            <h3>Subscription Expired</h3>
            <p className="subscription-detail">
              <span className="detail-label">Expired on:</span>
              <span className="detail-value">{formatDate(endDate)}</span>
            </p>
            <p className="subscription-message error">
              Your {isTrial ? 'trial' : 'subscription'} has expired. 
              Please renew to regain access to all features.
            </p>
          </div>
          <button 
            className="subscription-cta" 
            onClick={handleUpgrade}
          >
            Renew Subscription
          </button>
        </>
      );
    }
    
    // No subscription
    return (
      <>
        <div className="subscription-info">
          <h3>No Active Subscription</h3>
          <p className="subscription-message">
            Subscribe to access all premium features and services.
          </p>
        </div>
        <button 
          className="subscription-cta" 
          onClick={handleUpgrade}
        >
          View Plans
        </button>
      </>
    );
  };

  return (
    <div className={`subscription-status-card ${subscriptionData.status === 'expired' ? 'expired' : ''}`}>
      {renderSubscriptionContent()}
    </div>
  );
};

export default SubscriptionStatus;