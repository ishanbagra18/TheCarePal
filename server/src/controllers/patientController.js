import db from '../db/connection.js';
import { getAccessiblePatientsForUser } from './authController.js';

/**
 * Returns all patients accessible to the requesting user
 */
export function getPatients(req, res) {
  const patients = getAccessiblePatientsForUser(req.user.id, req.user.role);
  res.json(patients);
}

/**
 * Returns detailed patient profile including active medicines and assigned caregivers
 */
export function getPatientById(req, res) {
  // req.patient was already attached and validated by authorizePatientAccess middleware
  const patient = req.patient;

  // Retrieve assigned nurses
  const assignedNurses = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, ca.assigned_at
    FROM users u
    JOIN care_assignments ca ON ca.nurse_id = u.id
    WHERE ca.patient_id = ?
  `).all(patient.id);

  // Retrieve linked family members
  const linkedFamily = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, fl.relationship, fl.linked_at
    FROM users u
    JOIN family_links fl ON fl.family_user_id = u.id
    WHERE fl.patient_id = ?
  `).all(patient.id);

  // Retrieve active medicine schedule
  const medicineSchedule = db.prepare(`
    SELECT * FROM medicine_schedule
    WHERE patient_id = ? AND active = 1
    ORDER BY scheduled_time ASC
  `).all(patient.id);

  res.json({
    ...patient,
    assignedNurses,
    linkedFamily,
    medicineSchedule,
  });
}

