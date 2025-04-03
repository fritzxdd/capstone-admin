// server/controllers/secretaryController.js
const userService = require('../services/userService');
const admin = require('firebase-admin');

/**
 * Create a new secretary account and add to Realtime Database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createSecretary = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      lawFirm,
      adminUID
    } = req.body;

    // Validate required fields
    if (!name || !email || !lawFirm || !adminUID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate a temporary password for the secretary
    const tempPassword = userService.generateTemporaryPassword();

    // Create user account
    const userData = {
      name,
      email,
      password: tempPassword,
      role: 'secretary'
    };

    const userRecord = await userService.createUser(userData);

    // Add secretary details to the Realtime Database
    const secretaryData = {
      name,
      email,
      phone: phone || '',
      role: 'secretary',
      lawFirm,
      adminUID
    };

    // Add to Realtime Database
    await admin.database().ref(`secretaries/${userRecord.uid}`).set(secretaryData);

    // Return success response
    res.status(201).json({
      message: 'Secretary account created successfully',
      uid: userRecord.uid,
      tempPassword
    });
  } catch (error) {
    console.error('Error creating secretary:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a secretary's information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateSecretary = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    const { uid, role, password, ...secretaryData } = updateData;
    
    // Update secretary data in Realtime Database
    await admin.database().ref(`secretaries/${id}`).update(secretaryData);
    
    // If there's a password or name change, update Auth user
    if (updateData.password || updateData.name) {
      const authUpdateData = {};
      if (updateData.password) authUpdateData.password = updateData.password;
      if (updateData.name) authUpdateData.displayName = updateData.name;
      
      await userService.updateUser(id, authUpdateData);
    }
    
    res.status(200).json({ message: 'Secretary updated successfully' });
  } catch (error) {
    console.error('Error updating secretary:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a secretary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteSecretary = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove from Realtime Database
    await admin.database().ref(`secretaries/${id}`).remove();
    
    // Delete Authentication user
    await userService.deleteUser(id);
    
    res.status(200).json({ message: 'Secretary deleted successfully' });
  } catch (error) {
    console.error('Error deleting secretary:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get the secretary for a specific law firm
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSecretaryByLawFirm = async (req, res) => {
  try {
    const { lawFirm } = req.params;
    
    const secretariesRef = admin.database().ref('secretaries');
    const snapshot = await secretariesRef.orderByChild('lawFirm').equalTo(lawFirm).once('value');
    
    // We expect only one secretary per law firm
    let secretary = null;
    snapshot.forEach((childSnapshot) => {
      secretary = {
        id: childSnapshot.key,
        ...childSnapshot.val()
      };
      return true; // Exit the forEach loop after the first match
    });
    
    if (secretary) {
      res.status(200).json(secretary);
    } else {
      res.status(404).json({ message: 'No secretary found for this law firm' });
    }
  } catch (error) {
    console.error('Error fetching secretary:', error);
    res.status(500).json({ error: error.message });
  }
};