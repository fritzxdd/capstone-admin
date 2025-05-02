// server/middleware/auth.js
const admin = require('firebase-admin');

/**
 * Middleware to verify Firebase ID token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.verifyToken = async (req, res, next) => {
  // Get token from request headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    
    // Check if the user account is active
    // This check will apply to secretaries only
    if (decodedToken.customClaims && decodedToken.customClaims.role === 'secretary') {
      const secretaryRef = admin.database().ref(`secretaries/${decodedToken.uid}`);
      const snapshot = await secretaryRef.once('value');
      
      if (snapshot.exists()) {
        const secretaryData = snapshot.val();
        
        // If the account is explicitly set to inactive
        if (secretaryData.active === false) {
          return res.status(403).json({ 
            error: 'Account disabled', 
            message: 'Your account has been disabled. Please contact your administrator.',
            code: 'account_disabled'
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Middleware to check if user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.isAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  try {
    // Check custom claims first (if they exist)
    const { customClaims } = await admin.auth().getUser(req.user.uid);
    const isAdminInClaims = customClaims && customClaims.role === 'admin';
    
    if (isAdminInClaims) {
      return next();
    }
    
    // Fallback: Check law_firm_admin database entry
    const adminRef = admin.database().ref(`law_firm_admin/${req.user.uid}`);
    const snapshot = await adminRef.once('value');
    
    if (snapshot.exists()) {
      // User exists in law_firm_admin, so they are an admin
      return next();
    }
    
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ error: 'Server error while verifying admin status' });
  }
};

/**
 * Middleware to check if user is a secretary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.isSecretary = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  try {
    // Check custom claims first
    const { customClaims } = await admin.auth().getUser(req.user.uid);
    const isSecretaryInClaims = customClaims && customClaims.role === 'secretary';
    
    if (isSecretaryInClaims) {
      // Check if the secretary account is active
      const secretaryRef = admin.database().ref(`secretaries/${req.user.uid}`);
      const snapshot = await secretaryRef.once('value');
      
      if (snapshot.exists()) {
        const secretaryData = snapshot.val();
        
        // If the account is explicitly set to inactive
        if (secretaryData.active === false) {
          return res.status(403).json({ 
            error: 'Account disabled', 
            message: 'Your account has been disabled. Please contact your administrator.',
            code: 'account_disabled'
          });
        }
        
        // Active secretary - proceed
        req.secretaryData = secretaryData;
        return next();
      }
    }
    
    // Fallback: Check secretaries database entry
    const secretaryRef = admin.database().ref(`secretaries/${req.user.uid}`);
    const snapshot = await secretaryRef.once('value');
    
    if (snapshot.exists()) {
      const secretaryData = snapshot.val();
      
      // Check if the account is active
      if (secretaryData.active === false) {
        return res.status(403).json({ 
          error: 'Account disabled', 
          message: 'Your account has been disabled. Please contact your administrator.',
          code: 'account_disabled'
        });
      }
      
      // Active secretary - proceed
      req.secretaryData = secretaryData;
      return next();
    }
    
    return res.status(403).json({ error: 'Forbidden: Secretary access required' });
  } catch (error) {
    console.error('Error checking secretary status:', error);
    return res.status(500).json({ error: 'Server error while verifying secretary status' });
  }
};

/**
 * Middleware to check if user's account is active
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.isAccountActive = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  try {
    const { customClaims } = await admin.auth().getUser(req.user.uid);
    
    // Admins are always considered active
    if (customClaims && customClaims.role === 'admin') {
      return next();
    }
    
    // For secretaries, check the active status
    if (customClaims && customClaims.role === 'secretary') {
      const secretaryRef = admin.database().ref(`secretaries/${req.user.uid}`);
      const snapshot = await secretaryRef.once('value');
      
      if (snapshot.exists()) {
        const secretaryData = snapshot.val();
        
        // If the account is explicitly set to inactive
        if (secretaryData.active === false) {
          return res.status(403).json({ 
            error: 'Account disabled', 
            message: 'Your account has been disabled. Please contact your administrator.',
            code: 'account_disabled'
          });
        }
      }
    }
    
    // For other roles or if no specific check is implemented, proceed
    next();
  } catch (error) {
    console.error('Error checking account status:', error);
    return res.status(500).json({ error: 'Server error while verifying account status' });
  }
};

module.exports = {
  verifyToken: exports.verifyToken,
  isAdmin: exports.isAdmin,
  isSecretary: exports.isSecretary,
  isAccountActive: exports.isAccountActive
};