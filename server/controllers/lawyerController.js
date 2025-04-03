// server/controllers/lawyerController.js
const userService = require('../services/userService');
const admin = require('firebase-admin');

/**
 * Create a new lawyer account and add to Realtime Database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createLawyer = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      specialization,
      licenseNumber,
      experience,
      lawFirm,
      adminUID,
      secretaryID = ""
    } = req.body;

    // Validate required fields
    if (!name || !email || !lawFirm || !adminUID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate a temporary password for the lawyer
    const tempPassword = userService.generateTemporaryPassword();

    // Create user account
    const userData = {
      name,
      email,
      password: tempPassword,
      role: 'lawyer'
    };

    const userRecord = await userService.createUser(userData);

    // Add lawyer details to the Realtime Database
    const lawyerData = {
      name,
      email,
      phone: phone || '',
      specialization: specialization || '',
      licenseNumber: licenseNumber || '',
      experience: experience || '',
      role: 'lawyer',
      profileImage: '',
      lawFirm,
      adminUID,
      secretaryID
    };

    // Add to Realtime Database
    await admin.database().ref(`lawyers/${userRecord.uid}`).set(lawyerData);

    // Notify admin about successful creation (in a real app, would send an email)
    // ... email code here ...

    // Return success response
    res.status(201).json({
      message: 'Lawyer account created successfully',
      uid: userRecord.uid,
      tempPassword
    });
  } catch (error) {
    console.error('Error creating lawyer:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a lawyer's information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateLawyer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    const { uid, role, password, ...lawyerData } = updateData;
    
    // Update lawyer data in Realtime Database
    await admin.database().ref(`lawyers/${id}`).update(lawyerData);
    
    // If there's a password or name change, update Auth user
    if (updateData.password || updateData.name) {
      const authUpdateData = {};
      if (updateData.password) authUpdateData.password = updateData.password;
      if (updateData.name) authUpdateData.displayName = updateData.name;
      
      await userService.updateUser(id, authUpdateData);
    }
    
    res.status(200).json({ message: 'Lawyer updated successfully' });
  } catch (error) {
    console.error('Error updating lawyer:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a lawyer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteLawyer = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove from Realtime Database
    await admin.database().ref(`lawyers/${id}`).remove();
    
    // Delete Authentication user
    await userService.deleteUser(id);
    
    res.status(200).json({ message: 'Lawyer deleted successfully' });
  } catch (error) {
    console.error('Error deleting lawyer:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all lawyers for a specific law firm
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLawyersByLawFirm = async (req, res) => {
  try {
    const { lawFirm } = req.params;
    
    const lawyersRef = admin.database().ref('lawyers');
    const snapshot = await lawyersRef.orderByChild('lawFirm').equalTo(lawFirm).once('value');
    
    const lawyers = [];
    snapshot.forEach((childSnapshot) => {
      lawyers.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    res.status(200).json(lawyers);
  } catch (error) {
    console.error('Error fetching lawyers:', error);
    res.status(500).json({ error: error.message });
  }
};