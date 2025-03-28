/**
 * Format a date to a readable string
 * @param {Date} date - The date to format
 * @param {Object} options - Formatting options
 * @returns {String} Formatted date string
 */
export const formatDate = (date, options = {}) => {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    return new Intl.DateTimeFormat('en-US', formatOptions).format(
      date instanceof Date ? date : new Date(date)
    );
  };
  
  /**
   * Get the current date in YYYY-MM-DD format
   * @returns {String} Today's date in YYYY-MM-DD format
   */
  export const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };
  
  /**
   * Group dates by month/year for analytics
   * @param {Array} data - Array of objects with date properties
   * @param {String} dateField - The field name containing the date
   * @returns {Object} Data grouped by month/year
   */
  export const groupByMonth = (data, dateField = 'date') => {
    const grouped = {};
    
    data.forEach(item => {
      if (item[dateField]) {
        const date = new Date(item[dateField]);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!grouped[monthYear]) {
          grouped[monthYear] = [];
        }
        
        grouped[monthYear].push(item);
      }
    });
    
    return grouped;
  };