// server/middleware/validation.js

/**
 * Validate lawyer creation data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.validateLawyerData = (req, res, next) => {
    const { name, email, lawFirm, adminUID } = req.body;
    
    // Check for required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    if (!lawFirm) {
      return res.status(400).json({ error: 'Law firm is required' });
    }
    
    if (!adminUID) {
      return res.status(400).json({ error: 'Admin UID is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  
    next();
  };
  
  /**
   * Validate secretary creation data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  exports.validateSecretaryData = (req, res, next) => {
    const { name, email, lawFirm, adminUID } = req.body;
    
    // Check for required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    if (!lawFirm) {
      return res.status(400).json({ error: 'Law firm is required' });
    }
    
    if (!adminUID) {
      return res.status(400).json({ error: 'Admin UID is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  
    next();
  };
  
  /**
   * Validate user update data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  exports.validateUpdateData = (req, res, next) => {
    const { email } = req.body;
    
    // If email is provided, validate format
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }
    
    // Password validation if provided
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
    }
  
    next();
  };