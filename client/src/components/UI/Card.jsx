import React from 'react';

const Card = ({ 
  children, 
  title = '', 
  subtitle = '', 
  className = '',
  headerClassName = '',
  contentClassName = '',
  footer = null,
  variant = 'default',
  onClick = null
}) => {
  const variantClasses = {
    'default': '',
    'primary': 'card-primary',
    'secondary': 'card-secondary',
    'accent': 'card-accent',
    'outline': 'card-outline'
  };

  const cardClass = `card ${variantClasses[variant] || ''} ${className}`;
  const isClickable = onClick ? 'card-clickable' : '';
  
  return (
    <div className={`${cardClass} ${isClickable}`} onClick={onClick}>
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