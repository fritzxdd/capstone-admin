import React from 'react';

const Card = ({ 
  children, 
  title = '', 
  subtitle = '', 
  className = '',
  headerClassName = '',
  contentClassName = '',
  footer = null
}) => {
  return (
    <div className={`card ${className}`}>
      {(title || subtitle) && (
        <div className={`card-header ${headerClassName}`}>
          {title && <h2 className="card-title">{title}</h2>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
          <div className="header-underline"></div>
        </div>
      )}
      
      <div className={`card-content ${contentClassName}`}>
        {children}
      </div>
      
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;