import { z } from 'zod';
import crypto from 'crypto';
import db from '../db/connection.js';
import { checkVitalRange } from '../config/normalRanges.js';
import { sendFamilyAlertEmail } from '../utils/mailer.js';

// --- Zod Validation Schemas ---

const vitalSchema = z.object({
  type: z.enum(['bp', 'pulse', 'spo2', 'sugar', 'temp', 'weight']),
  value: z.number().positive('Value must be a positive number'),
  value2: z.number().positive().optional().nullable(),
  unit: z.string().min(1, 'Unit is required'),
  notes: z.string().optional().nullable(),
  recorded_at: z.string().optional(),
});

const mealSchema = z.object({
  type: z.enum(['breakfast', 'lunch', 'snack', 'dinner']),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  portion: z.enum(['none', 'quarter', 'half', 'most', 'full']),
  notes: z.string().optional().nullable(),
  logged_at: z.string().optional(),
});

const waterSchema = z.object({
  ml: z.number().int().positive('Water intake must be positive (in ml)'),
  logged_at: z.string().optional(),
});

const doseSchema = z.object({
  schedule_id: z.string().min(1, 'Schedule ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: z.enum(['given', 'missed']),
  time_given: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const activitySchema = z.object({
  type: z.enum(['walk', 'exercise', 'physio', 'outing', 'other']),
  minutes: z.number().int().positive('Minutes must be a positive number'),
  note: z.string().optional().nullable(),
  logged_at: z.string().optional(),
});

const moodSchema = z.object({
  mood: z.number().int().min(1).max(5),
  label: z.string().min(1),
  note: z.string().optional().nullable(),
  logged_at: z.string().optional(),
});

const observationSchema = z.object({
  text: z.string().min(3, 'Observation text must be at least 3 characters'),
  logged_at: z.string().optional(),
});

// Helper for generating standard ISO timestamp if not provided
const getTimestamp = (input) => input || new Date().toISOString();

/**
 * GET /api/patients/:patientId/daily?date=YYYY-MM-DD
 * Aggregates all care categories for a specific date in UTC
 */
export function getDailyLog(req, res, next) {
  try {
    const { patientId } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Date range for timestamp matching: date 00:00:00 to 23:59:59 UTC
    const dateStart = `${date}T00:00:00.000Z`;
    const dateEnd = `${date}T23:59:59.999Z`;

    // 1. Vitals
    const vitals = db.prepare(`
      SELECT v.*, u.name as nurse_name
      FROM vitals v
      LEFT JOIN users u ON u.id = v.nurse_id
      WHERE v.patient_id = ? AND v.recorded_at BETWEEN ? AND ?
      ORDER BY v.recorded_at DESC
    `).all(patientId, dateStart, dateEnd);

    // 2. Meals
    const meals = db.prepare(`
      SELECT m.*, u.name as nurse_name
      FROM meals m
      LEFT JOIN users u ON u.id = m.nurse_id
      WHERE m.patient_id = ? AND m.logged_at BETWEEN ? AND ?
      ORDER BY m.logged_at ASC
    `).all(patientId, dateStart, dateEnd);

    // 3. Water Intake
    const waterEntries = db.prepare(`
      SELECT w.*, u.name as nurse_name
      FROM water_intake w
      LEFT JOIN users u ON u.id = w.nurse_id
      WHERE w.patient_id = ? AND w.logged_at BETWEEN ? AND ?
      ORDER BY w.logged_at ASC
    `).all(patientId, dateStart, dateEnd);

    const totalWaterMl = waterEntries.reduce((sum, entry) => sum + entry.ml, 0);

    // 4. Medicine Schedules + Dose records for this date
    const schedules = db.prepare(`
      SELECT * FROM medicine_schedule
      WHERE patient_id = ? AND active = 1
      ORDER BY scheduled_time ASC
    `).all(patientId);

    const doses = db.prepare(`
      SELECT md.*, u.name as nurse_name
      FROM medicine_doses md
      LEFT JOIN users u ON u.id = md.nurse_id
      WHERE md.patient_id = ? AND md.date = ?
    `).all(patientId, date);

    const medicines = schedules.map(sched => {
      const recordedDose = doses.find(d => d.schedule_id === sched.id) || null;
      return {
        ...sched,
        doseRecord: recordedDose,
      };
    });

    // 5. Activities
    const activities = db.prepare(`
      SELECT a.*, u.name as nurse_name
      FROM activities a
      LEFT JOIN users u ON u.id = a.nurse_id
      WHERE a.patient_id = ? AND a.logged_at BETWEEN ? AND ?
      ORDER BY a.logged_at DESC
    `).all(patientId, dateStart, dateEnd);

    const totalActivityMinutes = activities.reduce((sum, a) => sum + a.minutes, 0);

    // 6. Mood Entries
    const moods = db.prepare(`
      SELECT m.*, u.name as nurse_name
      FROM mood_entries m
      LEFT JOIN users u ON u.id = m.nurse_id
      WHERE m.patient_id = ? AND m.logged_at BETWEEN ? AND ?
      ORDER BY m.logged_at DESC
    `).all(patientId, dateStart, dateEnd);

    // 7. Nurse Observations
    const observations = db.prepare(`
      SELECT o.*, u.name as nurse_name
      FROM observations o
      LEFT JOIN users u ON u.id = o.nurse_id
      WHERE o.patient_id = ? AND o.logged_at BETWEEN ? AND ?
      ORDER BY o.logged_at DESC
    `).all(patientId, dateStart, dateEnd);

    // 8. Photos
    const photos = db.prepare(`
      SELECT p.*, u.name as nurse_name
      FROM photos p
      LEFT JOIN users u ON u.id = p.nurse_id
      WHERE p.patient_id = ? AND p.logged_at BETWEEN ? AND ?
      ORDER BY p.logged_at DESC
    `).all(patientId, dateStart, dateEnd);

    // Consolidated Chronological Timeline: Merge all events with standardized timestamp & sorting
    const timeline = [];

    // Vitals in timeline
    vitals.forEach(v => {
      timeline.push({
        id: v.id,
        category: 'vital',
        timestamp: v.recorded_at,
        title: v.type === 'bp' ? `Blood Pressure: ${v.value}/${v.value2} mmHg` : `${v.type.toUpperCase()}: ${v.value} ${v.unit}`,
        subtitle: v.type === 'bp' ? 'BP Reading' : `${v.type.toUpperCase()} reading`,
        type: v.type,
        value: v.value,
        value2: v.value2,
        unit: v.unit,
        is_out_of_range: v.is_out_of_range === 1,
        notes: v.notes,
        nurse_name: v.nurse_name,
      });
    });

    // Meals in timeline
    meals.forEach(m => {
      timeline.push({
        id: m.id,
        category: 'meal',
        timestamp: m.logged_at,
        title: `${m.type.charAt(0).toUpperCase() + m.type.slice(1)}: ${m.description}`,
        subtitle: `Portion: ${m.portion}`,
        mealType: m.type,
        portion: m.portion,
        notes: m.notes,
        nurse_name: m.nurse_name,
      });
    });

    // Water in timeline
    waterEntries.forEach(w => {
      timeline.push({
        id: w.id,
        category: 'water',
        timestamp: w.logged_at,
        title: `Water Intake: ${w.ml} ml`,
        subtitle: 'Hydration',
        ml: w.ml,
        nurse_name: w.nurse_name,
      });
    });

    // Medicines in timeline (from doses)
    doses.forEach(d => {
      const sched = schedules.find(s => s.id === d.schedule_id);
      timeline.push({
        id: d.id,
        category: 'medicine',
        timestamp: d.recorded_at || `${date}T${d.time_given || '12:00'}:00.000Z`,
        title: `${sched ? sched.name : 'Medication'} (${sched ? sched.dose : ''})`,
        subtitle: d.status === 'given' ? `Given at ${d.time_given || sched?.scheduled_time}` : 'Missed',
        status: d.status,
        time_given: d.time_given,
        scheduled_time: sched?.scheduled_time,
        note: d.note,
        nurse_name: d.nurse_name,
      });
    });

    // Activities in timeline
    activities.forEach(a => {
      timeline.push({
        id: a.id,
        category: 'activity',
        timestamp: a.logged_at,
        title: `${a.type.charAt(0).toUpperCase() + a.type.slice(1)} (${a.minutes} mins)`,
        subtitle: 'Physical Activity',
        type: a.type,
        minutes: a.minutes,
        note: a.note,
        nurse_name: a.nurse_name,
      });
    });

    // Mood in timeline
    moods.forEach(m => {
      timeline.push({
        id: m.id,
        category: 'mood',
        timestamp: m.logged_at,
        title: `Mood: ${m.label} (${m.mood}/5)`,
        subtitle: 'Patient Demeanor',
        mood: m.mood,
        label: m.label,
        note: m.note,
        nurse_name: m.nurse_name,
      });
    });

    // Observations in timeline
    observations.forEach(o => {
      timeline.push({
        id: o.id,
        category: 'observation',
        timestamp: o.logged_at,
        title: 'Nurse Observation',
        subtitle: o.text,
        text: o.text,
        nurse_name: o.nurse_name,
      });
    });

    // Photos in timeline
    photos.forEach(p => {
      timeline.push({
        id: p.id,
        category: 'photo',
        timestamp: p.logged_at,
        title: `Photo: ${p.caption || `${p.category.toUpperCase()} photo`}`,
        subtitle: p.category,
        file_path: p.file_path,
        caption: p.caption,
        category_name: p.category,
        nurse_name: p.nurse_name,
      });
    });

    // Sort timeline chronologically (earliest first or latest first - let's sort earliest first for daily progression)
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      date,
      timeline,
      vitals,
      meals,
      water: {
        totalMl: totalWaterMl,
        entries: waterEntries,
      },
      medicines,
      activities: {
        totalMinutes: totalActivityMinutes,
        entries: activities,
      },
      moods,
      latestMood: moods[0] || null,
      observations,
      photos,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients/:patientId/calendar-dots?month=YYYY-MM
 * Returns all distinct dates within a month (or all dates) that have care logs or alerts,
 * for rendering visual dot badges on the calendar.
 */
export function getCalendarDots(req, res, next) {
  try {
    const { patientId } = req.params;
    const month = req.query.month; // Optional YYYY-MM

    // Collect dates with activity across all tables
    let monthFilter = '';
    const params = [patientId];

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      monthFilter = `AND substr(date_col, 1, 7) = ?`;
      params.push(month);
    }

    const query = `
      SELECT DISTINCT substr(recorded_at, 1, 10) as date FROM vitals WHERE patient_id = ?
      UNION
      SELECT DISTINCT substr(logged_at, 1, 10) as date FROM meals WHERE patient_id = ?
      UNION
      SELECT DISTINCT substr(logged_at, 1, 10) as date FROM water_intake WHERE patient_id = ?
      UNION
      SELECT DISTINCT date FROM medicine_doses WHERE patient_id = ?
      UNION
      SELECT DISTINCT substr(logged_at, 1, 10) as date FROM activities WHERE patient_id = ?
      UNION
      SELECT DISTINCT substr(logged_at, 1, 10) as date FROM mood_entries WHERE patient_id = ?
      UNION
      SELECT DISTINCT substr(logged_at, 1, 10) as date FROM observations WHERE patient_id = ?
    `;

    const allDates = db.prepare(query).all(patientId, patientId, patientId, patientId, patientId, patientId, patientId);

    // Also find dates that have alerts (e.g. out of range vitals or missed medicines)
    const alertDatesQuery = `
      SELECT DISTINCT substr(sent_at, 1, 10) as date FROM alerts WHERE patient_id = ?
    `;
    const alertDates = db.prepare(alertDatesQuery).all(patientId);

    res.json({
      datesWithLogs: allDates.map(r => r.date).filter(Boolean).sort(),
      datesWithAlerts: alertDates.map(r => r.date).filter(Boolean).sort(),
    });
  } catch (err) {
    next(err);
  }
}

// --- Vitals Handlers ---

export function createVital(req, res, next) {
  try {
    const { patientId } = req.params;
    const nurseId = req.user.id;
    const data = vitalSchema.parse(req.body);

    const recordedAt = getTimestamp(data.recorded_at);
    const rangeCheck = checkVitalRange(data.type, data.value, data.value2);
    // Support client-generated ID for offline sync deduplication
    const id = req.body.id || `vital-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO vitals (id, patient_id, nurse_id, recorded_at, type, value, value2, unit, notes, is_out_of_range)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        value = excluded.value,
        value2 = excluded.value2,
        unit = excluded.unit,
        notes = excluded.notes,
        is_out_of_range = excluded.is_out_of_range
    `).run(
      id,
      patientId,
      nurseId,
      recordedAt,
      data.type,
      data.value,
      data.value2 || null,
      data.unit,
      data.notes || null,
      rangeCheck.isOutOfRange ? 1 : 0
    );

    // Create alert record and dispatch email alert if abnormal reading
    if (rangeCheck.isOutOfRange) {
      const alertId = `alert-${crypto.randomUUID()}`;
      const msg = `Abnormal ${data.type.toUpperCase()} reading: ${data.value}${data.value2 ? `/${data.value2}` : ''} ${data.unit} (${rangeCheck.reason || 'Out of normal range'})`;
      db.prepare(`
        INSERT INTO alerts (id, patient_id, kind, message, sent_at, channel, reference_id)
        VALUES (?, ?, 'vital_out_of_range', ?, ?, 'in_app', ?)
      `).run(alertId, patientId, msg, recordedAt, id);

      // Send email alert to linked family members (ensures once per event)
      sendFamilyAlertEmail({
        patientId,
        kind: 'vital_out_of_range',
        message: msg,
        referenceId: id,
      }).catch(err => console.error('Email alert background error:', err));
    }

    const created = db.prepare('SELECT * FROM vitals WHERE id = ?').get(id);
    res.status(201).json({
      message: 'Vital reading logged successfully',
      vital: created,
      rangeCheck,
    });
  } catch (err) {
    next(err);
  }
}

export function updateVital(req, res, next) {
  try {
    const { patientId, id } = req.params;
    const data = vitalSchema.parse(req.body);

    const existing = db.prepare('SELECT * FROM vitals WHERE id = ? AND patient_id = ?').get(id, patientId);
    if (!existing) {
      return res.status(404).json({ error: 'Vital entry not found' });
    }

    const rangeCheck = checkVitalRange(data.type, data.value, data.value2);
    const recordedAt = data.recorded_at || existing.recorded_at;

    db.prepare(`
      UPDATE vitals
      SET type = ?, value = ?, value2 = ?, unit = ?, notes = ?, recorded_at = ?, is_out_of_range = ?
      WHERE id = ? AND patient_id = ?
    `).run(
      data.type,
      data.value,
      data.value2 || null,
      data.unit,
      data.notes || null,
      recordedAt,
      rangeCheck.isOutOfRange ? 1 : 0,
      id,
      patientId
    );

    const updated = db.prepare('SELECT * FROM vitals WHERE id = ?').get(id);
    res.json({ message: 'Vital entry updated', vital: updated, rangeCheck });
  } catch (err) {
    next(err);
  }
}

export function deleteVital(req, res, next) {
  try {
    const { patientId, id } = req.params;
    const result = db.prepare('DELETE FROM vitals WHERE id = ? AND patient_id = ?').run(id, patientId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Vital entry not found' });
    }
    res.json({ message: 'Vital entry deleted' });
  } catch (err) {
    next(err);
  }
}

// --- Meals Handlers ---

export function createMeal(req, res, next) {
  try {
    const { patientId } = req.params;
    const nurseId = req.user.id;
    const data = mealSchema.parse(req.body);
    const loggedAt = getTimestamp(data.logged_at);
    const id = `meal-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO meals (id, patient_id, nurse_id, type, description, portion, logged_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientId, nurseId, data.type, data.description, data.portion, loggedAt, data.notes || null);

    const created = db.prepare('SELECT * FROM meals WHERE id = ?').get(id);
    res.status(201).json({ message: 'Meal logged successfully', meal: created });
  } catch (err) {
    next(err);
  }
}

export function updateMeal(req, res, next) {
  try {
    const { patientId, id } = req.params;
    const data = mealSchema.parse(req.body);

    const existing = db.prepare('SELECT * FROM meals WHERE id = ? AND patient_id = ?').get(id, patientId);
    if (!existing) {
      return res.status(404).json({ error: 'Meal entry not found' });
    }

    db.prepare(`
      UPDATE meals
      SET type = ?, description = ?, portion = ?, notes = ?, logged_at = ?
      WHERE id = ? AND patient_id = ?
    `).run(data.type, data.description, data.portion, data.notes || null, data.logged_at || existing.logged_at, id, patientId);

    const updated = db.prepare('SELECT * FROM meals WHERE id = ?').get(id);
    res.json({ message: 'Meal entry updated', meal: updated });
  } catch (err) {
    next(err);
  }
}

export function deleteMeal(req, res, next) {
  try {
    const { patientId, id } = req.params;
    const result = db.prepare('DELETE FROM meals WHERE id = ? AND patient_id = ?').run(id, patientId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Meal entry not found' });
    }
    res.json({ message: 'Meal entry deleted' });
  } catch (err) {
    next(err);
  }
}

// --- Water Intake Handlers ---

export function createWaterIntake(req, res, next) {
  try {
    const { patientId } = req.params;
    const nurseId = req.user.id;
    const data = waterSchema.parse(req.body);
    const loggedAt = getTimestamp(data.logged_at);
    const id = `water-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO water_intake (id, patient_id, nurse_id, ml, logged_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, patientId, nurseId, data.ml, loggedAt);

    const created = db.prepare('SELECT * FROM water_intake WHERE id = ?').get(id);
    res.status(201).json({ message: 'Water intake logged', entry: created });
  } catch (err) {
    next(err);
  }
}

export function deleteWaterIntake(req, res, next) {
  try {
    const { patientId, id } = req.params;
    const result = db.prepare('DELETE FROM water_intake WHERE id = ? AND patient_id = ?').run(id, patientId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Water entry not found' });
    }
    res.json({ message: 'Water entry deleted' });
  } catch (err) {
    next(err);
  }
}

// --- Medicine Dose Administration Handlers ---

export function logMedicineDose(req, res, next) {
  try {
    const { patientId } = req.params;
    const nurseId = req.user.id;
    const data = doseSchema.parse(req.body);

    // Verify schedule belongs to this patient
    const sched = db.prepare('SELECT * FROM medicine_schedule WHERE id = ? AND patient_id = ?').get(data.schedule_id, patientId);
    if (!sched) {
      return res.status(404).json({ error: 'Scheduled medicine not found for this patient' });
    }

    const now = new Date().toISOString();
    const id = `dose-${data.schedule_id}-${data.date}`;

    // Upsert dose record (UNIQUE on schedule_id, date)
    db.prepare(`
      INSERT INTO medicine_doses (id, schedule_id, patient_id, nurse_id, date, status, time_given, note, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(schedule_id, date) DO UPDATE SET
        status = excluded.status,
        time_given = excluded.time_given,
        note = excluded.note,
        nurse_id = excluded.nurse_id,
        recorded_at = excluded.recorded_at
    `).run(
      id,
      data.schedule_id,
      patientId,
      nurseId,
      data.date,
      data.status,
      data.time_given || (data.status === 'given' ? sched.scheduled_time : null),
      data.note || null,
      now
    );

    // Create missed dose alert if status is missed
    if (data.status === 'missed') {
      const alertId = `alert-${crypto.randomUUID()}`;
      const msg = `Missed Medication Alert: ${sched.name} (${sched.dose}) scheduled for ${sched.scheduled_time} was marked missed. Reason: ${data.note || 'None specified'}`;
      db.prepare(`
        INSERT INTO alerts (id, patient_id, kind, message, sent_at, channel, reference_id)
        VALUES (?, ?, 'missed_medicine', ?, ?, 'in_app', ?)
      `).run(alertId, patientId, msg, now, id);

      // Send email alert to linked family members
      sendFamilyAlertEmail({
        patientId,
        kind: 'missed_medicine',
        message: msg,
        referenceId: id,
      }).catch(err => console.error('Missed dose email alert error:', err));
    }

    const saved = db.prepare('SELECT * FROM medicine_doses WHERE id = ?').get(id);
    res.json({ message: `Medicine marked as ${data.status}`, dose: saved });
  } catch (err) {
    next(err);
  }
}

// --- Activities Handlers ---

export function createActivity(req, res, next) {
  try {
    const { patientId } = req.params;
    const nurseId = req.user.id;
    const data = activitySchema.parse(req.body);
    const loggedAt = getTimestamp(data.logged_at);
    const id = `act-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO activities (id, patient_id, nurse_id, type, minutes, note, logged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientId, nurseId, data.type, data.minutes, data.note || null, loggedAt);

    const created = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
    res.status(201).json({ message: 'Activity logged successfully', activity: created });
  } catch (err) {
    next(err);
  }
}

export function updateActivity(req, res, next) {
  try {
    const { patientId, id } = req.params;
    const data = activitySchema.parse(req.body);

    const existing = db.prepare('SELECT * FROM activities WHERE id = ? AND patient_id = ?').get(id, patientId);
    if (!existing) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    db.prepare(`
      UPDATE activities
      SET type = ?, minutes = ?, note = ?, logged_at = ?
      WHERE id = ? AND patient_id = ?
    `).run(data.type, data.minutes, data.note || null, data.logged_at || existing.logged_at, id, patientId);

    const updated = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
    res.json({ message: 'Activity updated', activity: updated });
  } catch (err) {
    next(err);
  }
}

export function deleteActivity(req, res, next) {
  try {
    const { patientId, id } = req.params;
    const result = db.prepare('DELETE FROM activities WHERE id = ? AND patient_id = ?').run(id, patientId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    next(err);
  }
}

// --- Mood Handlers ---

export function logMood(req, res, next) {
  try {
    const { patientId } = req.params;
    const nurseId = req.user.id;
    const data = moodSchema.parse(req.body);
    const loggedAt = getTimestamp(data.logged_at);
    const id = `mood-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO mood_entries (id, patient_id, nurse_id, mood, label, note, logged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientId, nurseId, data.mood, data.label, data.note || null, loggedAt);

    const created = db.prepare('SELECT * FROM mood_entries WHERE id = ?').get(id);
    res.status(201).json({ message: 'Mood recorded', entry: created });
  } catch (err) {
    next(err);
  }
}

// --- Nurse Observations Handlers ---

export function createObservation(req, res, next) {
  try {
    const { patientId } = req.params;
    const nurseId = req.user.id;
    const data = observationSchema.parse(req.body);
    const loggedAt = getTimestamp(data.logged_at);
    const id = `obs-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO observations (id, patient_id, nurse_id, text, logged_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, patientId, nurseId, data.text, loggedAt);

    const created = db.prepare('SELECT * FROM observations WHERE id = ?').get(id);
    res.status(201).json({ message: 'Observation saved', observation: created });
  } catch (err) {
    next(err);
  }
}

export function deleteObservation(req, res, next) {
  try {
    const { patientId, id } = req.params;
    const result = db.prepare('DELETE FROM observations WHERE id = ? AND patient_id = ?').run(id, patientId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Observation not found' });
    }
    res.json({ message: 'Observation deleted' });
  } catch (err) {
    next(err);
  }
}

// --- Photos Handlers ---

export function uploadPhotoHandler(req, res, next) {
  try {
    const { patientId } = req.params;
    const nurseId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file to upload.' });
    }

    const id = req.body.id || `photo-${crypto.randomUUID()}`;
    const loggedAt = getTimestamp(req.body.logged_at);
    const caption = req.body.caption ? req.body.caption.trim() : null;
    const category = req.body.category || 'general';
    const filePath = `/uploads/${req.file.filename}`;

    db.prepare(`
      INSERT INTO photos (id, patient_id, nurse_id, file_path, caption, category, logged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientId, nurseId, filePath, caption, category, loggedAt);

    const created = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
    res.status(201).json({ message: 'Photo uploaded successfully', photo: created });
  } catch (err) {
    next(err);
  }
}

export function deletePhoto(req, res, next) {
  try {
    const { patientId, id } = req.params;
    const result = db.prepare('DELETE FROM photos WHERE id = ? AND patient_id = ?').run(id, patientId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    next(err);
  }
}

