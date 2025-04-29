// FormLayout.jsx
import React from 'react';

/**
 * FormLayout component for consistent form styling across the application
 * @param {Object} props
 * @param {string} props.title - Form title
 * @param {ReactNode} props.children - Form content
 * @param {string} props.backTo - Path to navigate back to (for direct use)
 * @param {Function} props.onBack - Function to call when back button is clicked
 * @param {string} props.backText - Text for back button (optional)
 * @param {string} props.className - Additional CSS class (optional)
 * @returns {JSX.Element}
 */
const FormLayout = ({ 
  title, 
  children, 
  backTo = '/', 
  onBack,
  backText = 'Back',
  className = ''
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = backTo;
    }
  };

  return (
    <div className="container">
      <div className={`form-card ${className}`}>
        <div className="form-header">
          <button 
            onClick={handleBack} 
            className="back-button"
            aria-label="Go back"
          >
            <span className="icon-back"></span>
            {backText}
          </button>
          
          <h1 className="form-title">{title}</h1>
          <div className="header-underline"></div>
        </div>
        
        <div className="form-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FormLayout;