import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { ref, onValue } from 'firebase/database';
import '../../styles/index.css';

const SubscriptionStatus = () => {
  const [subscriptionData, setSubscriptionData] = useState({
    status: 'loading',
    endDate: null,
    isTrial: false,
    remainingDays: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
        
        // Update local state
        setSubscriptionData({
          status: endDate < now && status === 'active' ? 'expired' : status,
          endDate,
          isTrial,
          remainingDays
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
    const { status, isTrial, remainingDays, endDate } = subscriptionData;

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
    
    // Paid subscription
    if (status === 'active' && !isTrial) {
      return (
        <>
          <div className="subscription-info">
            <h3>Premium Subscription Active</h3>
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