/**
 * Format a phone number to standard format
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid phone number
    if (cleaned.length !== 10) {
      return phone; // Return original if not valid
    }
    
    // Format as (XXX) XXX-XXXX
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
  };
  
  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default: PHP)
   * @returns {string} Formatted currency string
   */
  export const formatCurrency = (amount, currency = 'PHP') => {
    if (amount === undefined || amount === null) return '';
    
    // Currency symbols
    const symbols = {
      PHP: '₱',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥'
    };
    
    const symbol = symbols[currency] || currency;
    
    // Format with thousand separators
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };
  
  /**
   * Truncate long text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  export const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  };
  
  /**
   * Format a name with proper capitalization
   * @param {string} name - Name to format
   * @returns {string} Formatted name
   */
  export const formatName = (name) => {
    if (!name) return '';
    
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };
  
  /**
   * Format an email address for display
   * @param {string} email - Email to format
   * @param {boolean} hideDetails - Whether to partially hide the email
   * @returns {string} Formatted email
   */
  export const formatEmail = (email, hideDetails = false) => {
    if (!email) return '';
    
    if (!hideDetails) {
      return email.toLowerCase();
    }
    
    // Partially hide the email for privacy
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    const [name, domain] = parts;
    const visibleNameLength = Math.min(3, name.length);
    const hiddenName = name.substring(0, visibleNameLength) + '...';
    
    return `${hiddenName}@${domain}`;
  };
  
  export default {
    formatPhoneNumber,
    formatCurrency,
    truncateText,
    formatName,
    formatEmail
  };