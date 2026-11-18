import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import db from '../db/connection.js';

/**
 * Verifies JWT token from httpOnly cookie or Authorization Bearer header.
 * Attaches the verified user record to req.user.
 */
export function authenticate(req, res, next) {
  let token = null;

  // 1. Check httpOnly cookie
  if (req.cookies && req.cookies.carepal_token) {
    token = req.cookies.carepal_token;
  }
  // 2. Fallback to Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

/**
 * Restricts endpoint to specific roles (e.g. 'nurse' or 'family')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Forbidden: This action requires role [${allowedRoles.join(' or ')}]. You are logged in as [${req.user.role}].` 
      });
    }

    next();
  };
}

/**
 * Comprehensive authorization middleware for Patient access:
 * - Nurses can READ & WRITE only for patients assigned to them.
 * - Family users can only READ data for patients linked to them.
 * - Family users get 403 on ANY write endpoint.
 * - Family users get 403 when trying to access other families' patients.
 * 
 * @param {Object} options
 * @param {boolean} [options.write=false] - If true, restricts to authorized nurses only
 */
export function authorizePatientAccess({ write = false } = {}) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Determine target patient ID from route params, request body, or query string
    const patientId = req.params.patientId || req.body.patient_id || req.body.patientId || req.query.patient_id || req.query.patientId;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required for this operation.' });
    }

    // Verify patient exists in database
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) {
      return res.status(404).json({ error: `Patient with ID '${patientId}' not found.` });
    }

    const { role, id: userId } = req.user;

    // RULE 1: Family members NEVER have write access to patient records
    if (write && role === 'family') {
      return res.status(403).json({
        error: 'Forbidden: Family members have read-only access. Only assigned nurses may log care records.'
      });
    }

    // RULE 2: Nurses can only access (read or write) patients assigned to them
    if (role === 'nurse') {
      const assignment = db.prepare(
        'SELECT 1 FROM care_assignments WHERE nurse_id = ? AND patient_id = ?'
      ).get(userId, patientId);

      if (!assignment) {
        return res.status(403).json({
          error: 'Forbidden: You are not assigned to care for this patient.'
        });
      }
    }

    // RULE 3: Family members can only read data for patients linked to them
    if (role === 'family') {
      const link = db.prepare(
        'SELECT 1 FROM family_links WHERE family_user_id = ? AND patient_id = ?'
      ).get(userId, patientId);

      if (!link) {
        return res.status(403).json({
          error: 'Forbidden: You are not authorized to view this patient\'s records.'
        });
      }
    }

    // Attach patient record to request for downstream handlers
    req.patient = patient;
    next();
  };
}

