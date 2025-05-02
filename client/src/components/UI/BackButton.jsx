// components/UI/BackButton.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * BackButton component for consistent navigation
 * @param {Object} props
 * @param {string} props.to - Path to navigate to (optional)
 * @param {string} props.label - Button label text (optional)
 * @param {Function} props.onClick - Custom click handler (optional)
 * @returns {JSX.Element}
 */
const BackButton = ({ 
  to = '/', 
  label = '',
  onClick,
  className = ''
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(to);
    }
  };

  return (
    <button 
      onClick={handleClick} 
      className={`back-button ${className}`}
      aria-label="Go back"
    >
      <span className="icon-back"></span>
      {label && <span className="back-label">{label}</span>}
    </button>
  );
};

export default BackButton;