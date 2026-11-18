import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../db/connection.js';
import { config } from '../config/env.js';

const loginSchema = z.object({
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Fetch patients accessible to the given user based on role
 */
export function getAccessiblePatientsForUser(userId, role) {
  if (role === 'nurse') {
    return db.prepare(`
      SELECT p.*, ca.assigned_at
      FROM patients p
      JOIN care_assignments ca ON ca.patient_id = p.id
      WHERE ca.nurse_id = ?
      ORDER BY p.name ASC
    `).all(userId);
  } else if (role === 'family') {
    return db.prepare(`
      SELECT p.*, fl.relationship, fl.linked_at
      FROM patients p
      JOIN family_links fl ON fl.patient_id = p.id
      WHERE fl.family_user_id = ?
      ORDER BY p.name ASC
    `).all(userId);
  }
  return [];
}

/**
 * Sign JWT token with 7-day expiration
 */
export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

/**
 * Login handler
 */
export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);

    // Set secure cookie (sameSite: 'none' and secure: true in production for cross-origin Vercel <-> Render)
    const isProd = config.nodeEnv === 'production';
    res.cookie('carepal_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const accessiblePatients = getAccessiblePatientsForUser(user.id, user.role);

    const userSafe = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    };

    res.json({
      message: 'Login successful',
      token,
      user: userSafe,
      accessiblePatients,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Logout handler
 */
export function logout(req, res) {
  const isProd = config.nodeEnv === 'production';
  res.clearCookie('carepal_token', {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  });
  res.json({ message: 'Logged out successfully' });
}

/**
 * Get current authenticated user profile and accessible patients
 */
export function getMe(req, res) {
  const accessiblePatients = getAccessiblePatientsForUser(req.user.id, req.user.role);
  res.json({
    user: req.user,
    accessiblePatients,
  });
}

/**
 * Demo accounts list for one-click login in UI
 */
export function getDemoAccounts(req, res) {
  res.json([
    {
      role: 'nurse',
      name: 'Nurse Priya Sharma',
      email: 'nurse1@demo.com',
      password: 'Demo@123',
      description: 'Assigned to Patient A (Ramesh) & Patient B (Kamla)'
    },
    {
      role: 'nurse',
      name: 'Nurse Sunita Patel',
      email: 'nurse2@demo.com',
      password: 'Demo@123',
      description: 'Assigned to Patient C (Anil)'
    },
    {
      role: 'family',
      name: 'Amit Sharma (Son)',
      email: 'family1@demo.com',
      password: 'Demo@123',
      description: 'Living in Bangalore, linked to Patient A (Ramesh)'
    },
    {
      role: 'family',
      name: 'Meera Verma (Daughter)',
      email: 'family2@demo.com',
      password: 'Demo@123',
      description: 'Living in London, linked to Patient C (Anil)'
    }
  ]);
}

