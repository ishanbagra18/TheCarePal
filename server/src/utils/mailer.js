import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { config } from '../config/env.js';
import db from '../db/connection.js';

let transporter = null;

if (config.smtp.host && config.smtp.user) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

/**
 * Sends an email alert to all linked family members when a clinical outlier occurs
 * (e.g. vital reading out of range or medication dose missed).
 * 
 * Rules:
 * - Ensures a family email is sent ONLY ONCE per event (deduplicated by reference_id).
 * - If SMTP is not configured, logs to console and stores in alerts table so demo still works.
 * 
 * @param {Object} params
 * @param {string} params.patientId
 * @param {string} params.kind - 'vital_out_of_range' | 'missed_medicine'
 * @param {string} params.message - Descriptive alert message
 * @param {string} params.referenceId - ID of the vital or dose entry
 */
export async function sendFamilyAlertEmail({ patientId, kind, message, referenceId }) {
  try {
    // 1. De-duplication check: Ensure email has not already been sent for this specific event
    if (referenceId) {
      const existingEmailAlert = db.prepare(`
        SELECT 1 FROM alerts
        WHERE patient_id = ? AND reference_id = ? AND channel = 'email'
      `).get(patientId, referenceId);

      if (existingEmailAlert) {
        return { sent: false, reason: 'Already sent for this event' };
      }
    }

    // 2. Fetch linked family members & patient info
    const patient = db.prepare('SELECT name, city FROM patients WHERE id = ?').get(patientId);
    if (!patient) return { sent: false, reason: 'Patient not found' };

    const familyMembers = db.prepare(`
      SELECT u.id, u.name, u.email
      FROM users u
      JOIN family_links fl ON fl.family_user_id = u.id
      WHERE fl.patient_id = ?
    `).all(patientId);

    if (familyMembers.length === 0) {
      return { sent: false, reason: 'No family members linked to patient' };
    }

    const recipientEmails = familyMembers.map(f => f.email);
    const alertId = `alert-email-${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    const subject = kind === 'vital_out_of_range'
      ? `[TheCarePal Alert] Abnormal Vital Sign Recorded for ${patient.name}`
      : `[TheCarePal Alert] Missed Medication Dose for ${patient.name}`;

    const textBody = `
Dear Family Member,

An important clinical care update has been recorded for your loved one:

Patient: ${patient.name} (${patient.city})
Event Type: ${kind === 'vital_out_of_range' ? 'Vital Reading Out of Normal Range' : 'Scheduled Medication Missed'}
Details: ${message}
Recorded At: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)

Please check your TheCarePal Family Dashboard for full daily timeline and vitals trends:
${config.clientUrl}

Warm regards,
TheCarePal Clinical Care Team
    `.trim();

    // 3. Fallback or SMTP dispatch
    if (!transporter) {
      // SMTP not configured: Log formatted alert to server console & store in alerts table
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 [CarePal Email Notification]`);
      console.log(`To: ${recipientEmails.join(', ')}`);
      console.log(`Subject: ${subject}`);
      console.log(`Message: ${message}`);
      console.log(`Note: SMTP not configured in .env. Logged to console & saved to alerts table.`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      await transporter.sendMail({
        from: `"TheCarePal Health Alerts" <${config.smtp.from}>`,
        to: recipientEmails.join(', '),
        subject,
        text: textBody,
      });
    }

    // 4. Store email alert record in database to guarantee single delivery per event
    db.prepare(`
      INSERT INTO alerts (id, patient_id, kind, message, sent_at, channel, reference_id)
      VALUES (?, ?, ?, ?, ?, 'email', ?)
    `).run(alertId, patientId, kind, message, nowIso, referenceId || null);

    return { sent: true, recipients: recipientEmails };
  } catch (err) {
    console.error('[CarePal Mailer Error]', err.message);
    return { sent: false, error: err.message };
  }
}

