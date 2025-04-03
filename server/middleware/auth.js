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