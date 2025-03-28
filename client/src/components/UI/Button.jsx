import React from 'react';

const Button = ({ 
  children, 
  type = 'button', 
  onClick, 
  variant = 'primary', 
  className = '', 
  icon = null,
  disabled = false,
  fullWidth = false,
  size = 'md'
}) => {
  const baseClass = 'btn';
  
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    neutral: 'btn-neutral'
  }[variant] || 'btn-primary';
  
  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  }[size] || '';
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      disabled={disabled}
    >
      {icon && <span className={`icon-${icon}`}></span>}
      {children}
    </button>
  );
};

export default Button;