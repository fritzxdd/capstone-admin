// routes/plans.js
const express = require('express');
const router = express.Router();
const plansController = require('../controllers/plansController');

// Plans routes
router.get('/', plansController.getAllPlans);
router.get('/:id', plansController.getPlanById);

module.exports = router;