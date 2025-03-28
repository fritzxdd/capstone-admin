import React from 'react';

const Loading = ({ 
  message = 'Loading...', 
  size = 'md',
  fullScreen = false
}) => {
  const sizeClass = {
    'sm': 'spinner-sm',
    'md': '',
    'lg': 'spinner-lg'
  }[size] || '';
  
  const containerClass = fullScreen ? 'loading-fullscreen' : 'loading-spinner';
  
  return (
    <div className={containerClass}>
      <div className={`spinner ${sizeClass}`}></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default Loading;