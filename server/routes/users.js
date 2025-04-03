// server/routes/users.js
const express = require('express');
const router = express.Router();
const lawyerController = require('../controllers/lawyerController');
const secretaryController = require('../controllers/secretaryController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');

// Apply authentication middleware to all routes
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

// Lawyer routes
router.post(
  '/lawyers', 
  validationMiddleware.validateLawyerData,
  lawyerController.createLawyer
);

router.put(
  '/lawyers/:id', 
  validationMiddleware.validateUpdateData,
  lawyerController.updateLawyer
);

router.delete(
  '/lawyers/:id', 
  lawyerController.deleteLawyer
);

router.get(
  '/lawyers/law-firm/:lawFirm',
  lawyerController.getLawyersByLawFirm
);

// Secretary routes
router.post(
  '/secretaries', 
  validationMiddleware.validateSecretaryData,
  secretaryController.createSecretary
);

router.put(
  '/secretaries/:id', 
  validationMiddleware.validateUpdateData,
  secretaryController.updateSecretary
);

router.delete(
  '/secretaries/:id', 
  secretaryController.deleteSecretary
);

router.get(
  '/secretaries/law-firm/:lawFirm',
  secretaryController.getSecretaryByLawFirm
);

module.exports = router;