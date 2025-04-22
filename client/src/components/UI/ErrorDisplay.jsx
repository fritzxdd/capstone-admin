// client/src/components/UI/ErrorDisplay.jsx

import React, { useState } from 'react';
import '../../styles/index.css';

const ErrorDisplay = ({ 
  error, 
  title = 'Error', 
  showDetails = false,
  onRetry = null, 
  onDismiss = null 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // If error is an object, try to get a meaningful message
  const errorMessage = error?.message || error?.error || 
                      (typeof error === 'string' ? error : 'An unknown error occurred');
  
  // Format error details if available
  const errorDetails = error?.stack || 
                      (error?.response?.data ? JSON.stringify(error.response.data, null, 2) : null) ||
                      (typeof error === 'object' ? JSON.stringify(error, null, 2) : null);
  
  return (
    <div className="error-display">
      <div className="error-header">
        <span className="error-icon">⚠️</span>
        <h3 className="error-title">{title}</h3>
        {onDismiss && (
          <button className="error-close" onClick={onDismiss}>×</button>
        )}
      </div>
      
      <div className="error-message">
        {errorMessage}
      </div>
      
      {errorDetails && showDetails && (
        <div className="error-actions">
          <button 
            className="error-toggle" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
          
          {expanded && (
            <pre className="error-details">
              {errorDetails}
            </pre>
          )}
        </div>
      )}
      
      <div className="error-footer">
        {onRetry && (
          <button className="error-retry" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;