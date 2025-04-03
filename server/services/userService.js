// server/services/userService.js
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new user account with Firebase Authentication
 * @param {Object} userData - User data including email and password
 * @returns {Promise<Object>} Created user data
 */
exports.createUser = async (userData) => {
  try {
    // Create user with Firebase Admin SDK
    const userRecord = await admin.auth().createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.name || '',
      disabled: false,
    });

    // Set custom claims to specify user role
    await admin.auth().setCustomUserClaims(userRecord.uid, { 
      role: userData.role 
    });

    // Return user data without sensitive info
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: userData.role
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update user data in Firebase Authentication
 * @param {string} uid - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} Updated user data
 */
exports.updateUser = async (uid, userData) => {
  try {
    // Remove sensitive fields that shouldn't be updated directly
    const { password, role, ...updateData } = userData;
    
    // Update user in Firebase Auth
    const userRecord = await admin.auth().updateUser(uid, updateData);
    
    // Update custom claims if role is provided
    if (role) {
      await admin.auth().setCustomUserClaims(uid, { role });
    }
    
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: role // Include the new role if provided
    };
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Delete a user account
 * @param {string} uid - User ID
 * @returns {Promise<void>}
 */
exports.deleteUser = async (uid) => {
  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Generate a temporary password for new users
 * @returns {string} A random password
 */
exports.generateTemporaryPassword = () => {
  // Generate a random password with at least 8 characters
  const randomId = uuidv4().replace(/-/g, '').substring(0, 8);
  return `Temp${randomId}!`;
};