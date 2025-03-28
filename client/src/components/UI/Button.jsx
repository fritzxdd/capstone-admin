import React from 'react';

const Button = ({ 
  children, 
  type = 'button', 
  onClick, 
  variant = 'primary', 
  className = '', 
  icon = null,
  disabled = false,
  fullWidth = false
}) => {
  const baseClass = 'btn';
  
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-neutral',
    danger: 'btn-danger',
    success: 'profile-save-btn',
    edit: 'profile-edit-btn',
    delete: 'profile-delete-btn'
  }[variant] || 'btn-primary';
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClass} ${variantClass} ${widthClass} ${className}`}
      disabled={disabled}
    >
      {icon && <span className={`icon-${icon}`}></span>}
      {children}
    </button>
  );
};

export default Button;