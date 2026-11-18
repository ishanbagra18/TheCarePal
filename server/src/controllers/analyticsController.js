import db from '../db/connection.js';
import { NORMAL_RANGES } from '../config/normalRanges.js';
import { calculateWeeklyMetrics } from '../utils/adherence.js';
import { generatePatientPdfReport } from '../utils/pdfGenerator.js';

/**
 * GET /api/patients/:patientId/charts/vitals?days=7|30
 * Returns time-series readings for each vital type over the requested window.
 */
export function getVitalsCharts(req, res, next) {
  try {
    const { patientId } = req.params;
    const daysParam = parseInt(req.query.days || '7', 10);
    const days = [7, 30].includes(daysParam) ? daysParam : 7;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoff.setHours(0, 0, 0, 0);
    const cutoffIso = cutoff.toISOString();

    const vitals = db.prepare(`
      SELECT id, recorded_at, type, value, value2, unit, notes, is_out_of_range
      FROM vitals
      WHERE patient_id = ? AND recorded_at >= ?
      ORDER BY recorded_at ASC
    `).all(patientId, cutoffIso);

    // Group readings by vital type
    const vitalsByType = {
      bp: [],
      pulse: [],
      spo2: [],
      sugar: [],
      temp: [],
      weight: [],
    };

    vitals.forEach(v => {
      if (vitalsByType[v.type]) {
        vitalsByType[v.type].push({
          id: v.id,
          timestamp: v.recorded_at,
          date: v.recorded_at.split('T')[0],
          value: v.value,
          value2: v.value2,
          unit: v.unit,
          is_out_of_range: v.is_out_of_range === 1,
          notes: v.notes,
        });
      }
    });

    res.json({
      days,
      ranges: NORMAL_RANGES,
      vitalsByType,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients/:patientId/reports/weekly?weekStart=YYYY-MM-DD
 * Returns weekly adherence, meals, activity, and mood compared to the prior week.
 */
export function getWeeklyReport(req, res, next) {
  try {
    const { patientId } = req.params;
    let weekStart = req.query.weekStart;

    // Default week start: 6 days before today (rolling 7 days ending today)
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      weekStart = d.toISOString().split('T')[0];
    }

    // Calculate current week metrics
    const currentWeek = calculateWeeklyMetrics(db, patientId, weekStart);

    // Calculate previous 7-day period for direct comparison
    const prevStartDate = new Date(weekStart);
    prevStartDate.setDate(prevStartDate.getDate() - 7);
    const prevStartStr = prevStartDate.toISOString().split('T')[0];
    const previousWeek = calculateWeeklyMetrics(db, patientId, prevStartStr);

    // Compute deltas (current - previous)
    const deltas = {
      adherenceRate: currentWeek.medication.adherenceRate - previousWeek.medication.adherenceRate,
      mealCompletionRate: currentWeek.nutrition.mealCompletionRate - previousWeek.nutrition.mealCompletionRate,
      activityMinutes: currentWeek.activity.totalMinutes - previousWeek.activity.totalMinutes,
      moodScore: Number((currentWeek.mood.averageScore - previousWeek.mood.averageScore).toFixed(1)),
    };

    res.json({
      currentWeek,
      previousWeek,
      deltas,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients/:patientId/reports/pdf?days=30
 * Generates and streams a 30-day medical PDF report for a physician consultation.
 */
export function downloadDoctorPdfReport(req, res, next) {
  try {
    const patient = req.patient;
    const days = parseInt(req.query.days || '30', 10);

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];
    const startIso = `${startDate}T00:00:00.000Z`;
    const endIso = `${endDate}T23:59:59.999Z`;

    // 1. Vitals
    const vitals = db.prepare(`
      SELECT * FROM vitals
      WHERE patient_id = ? AND recorded_at BETWEEN ? AND ?
      ORDER BY recorded_at ASC
    `).all(patient.id, startIso, endIso);

    // 2. Missed Doses with Medicine Name
    const missedDoses = db.prepare(`
      SELECT md.*, ms.name, ms.dose, ms.scheduled_time
      FROM medicine_doses md
      JOIN medicine_schedule ms ON ms.id = md.schedule_id
      WHERE md.patient_id = ? AND md.date BETWEEN ? AND ? AND md.status = 'missed'
      ORDER BY md.date DESC
    `).all(patient.id, startDate, endDate);

    // 3. Overall Adherence
    const totalDosesCount = db.prepare(`
      SELECT count(*) as count FROM medicine_doses
      WHERE patient_id = ? AND date BETWEEN ? AND ?
    `).get(patient.id, startDate, endDate).count;

    const givenDosesCount = db.prepare(`
      SELECT count(*) as count FROM medicine_doses
      WHERE patient_id = ? AND date BETWEEN ? AND ? AND status = 'given'
    `).get(patient.id, startDate, endDate).count;

    const adherenceRate = totalDosesCount > 0
      ? Math.round((givenDosesCount / totalDosesCount) * 100)
      : 100;

    // 4. Meals & Nutrition
    const meals = db.prepare(`
      SELECT portion FROM meals
      WHERE patient_id = ? AND logged_at BETWEEN ? AND ?
    `).all(patient.id, startIso, endIso);

    const completedMeals = meals.filter(m => ['half', 'most', 'full'].includes(m.portion)).length;
    const expectedMeals = days * 3;
    const mealCompletionRate = expectedMeals > 0
      ? Math.min(100, Math.round((completedMeals / expectedMeals) * 100))
      : 90;

    // 5. Activity
    const activitySum = db.prepare(`
      SELECT coalesce(sum(minutes), 0) as total_minutes
      FROM activities
      WHERE patient_id = ? AND logged_at BETWEEN ? AND ?
    `).get(patient.id, startIso, endIso);

    // 6. Mood
    const moods = db.prepare(`
      SELECT mood FROM mood_entries
      WHERE patient_id = ? AND logged_at BETWEEN ? AND ?
    `).all(patient.id, startIso, endIso);

    const avgMood = moods.length > 0
      ? Number((moods.reduce((sum, m) => sum + m.mood, 0) / moods.length).toFixed(1))
      : 4.1;

    // 7. Recent Observations
    const observations = db.prepare(`
      SELECT * FROM observations
      WHERE patient_id = ? AND logged_at BETWEEN ? AND ?
      ORDER BY logged_at DESC
      LIMIT 8
    `).all(patient.id, startIso, endIso);

    const filename = `TheCarePal_Report_${patient.name.replace(/[^a-zA-Z0-9]/g, '_')}_${endDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    generatePatientPdfReport({
      patient,
      vitals,
      adherence: { adherenceRate, totalDosesCount, givenDosesCount },
      missedDoses,
      nutrition: { mealCompletionRate, completedMeals },
      activity: { totalMinutes: activitySum.total_minutes },
      mood: { averageScore: avgMood },
      observations,
      startDate,
      endDate,
    }, res);
  } catch (err) {
    next(err);
  }
}

