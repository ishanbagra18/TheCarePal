import express from 'express';
import { getPatients, getPatientById } from '../controllers/patientController.js';
import { authenticate, authorizePatientAccess } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List patients for current user
router.get('/', getPatients);

// Get single patient by ID (enforces assignment/link authorization check)
router.get('/:patientId', authorizePatientAccess({ write: false }), getPatientById);

export default router;

