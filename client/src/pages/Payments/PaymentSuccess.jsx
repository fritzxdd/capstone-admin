// Update your PaymentSuccess.jsx with this simpler version
import React from "react";
import { useNavigate } from "react-router-dom";
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
  
  const handleReturnHome = () => {
    navigate("/");
  };
  
  return (
    <div className="success-page-container">
      <div className="success-card">
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
            <span className="detail-value">Subscription Plan</span>
          </div>
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
      </div>
    </div>
  );
};

export default PaymentSuccess;