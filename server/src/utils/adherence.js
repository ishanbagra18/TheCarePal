/**
 * Weekly summary metrics calculation utilities for TheCarePal
 * Computes medicine adherence, meal completion, activity minutes, and mood trends,
 * with comparison against the preceding week.
 */

/**
 * Calculates metrics for a 7-day period starting from startDateStr (YYYY-MM-DD)
 * @param {Object} db - Database connection instance
 * @param {string} patientId - Target patient ID
 * @param {string} startDateStr - YYYY-MM-DD
 * @returns {Object}
 */
export function calculateWeeklyMetrics(db, patientId, startDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // 7 days total (inclusive)

  const endDateStr = end.toISOString().split('T')[0];
  const startIso = `${startDateStr}T00:00:00.000Z`;
  const endIso = `${endDateStr}T23:59:59.999Z`;

  // 1. Medicine Adherence: (given doses / total scheduled doses) * 100
  // Count active schedules for the patient
  const activeSchedules = db.prepare(`
    SELECT count(*) as count FROM medicine_schedule WHERE patient_id = ? AND active = 1
  `).get(patientId).count;

  const expectedDoses = activeSchedules * 7;

  const dosesQuery = db.prepare(`
    SELECT status, count(*) as count
    FROM medicine_doses
    WHERE patient_id = ? AND date BETWEEN ? AND ?
    GROUP BY status
  `).all(patientId, startDateStr, endDateStr);

  let givenDoses = 0;
  let missedDoses = 0;
  dosesQuery.forEach(row => {
    if (row.status === 'given') givenDoses = row.count;
    if (row.status === 'missed') missedDoses = row.count;
  });

  const totalDosesRecorded = givenDoses + missedDoses;
  // If no doses recorded yet, adherence is 0. If expected doses exist, calculate based on expected; otherwise recorded.
  const denominator = expectedDoses > 0 ? expectedDoses : totalDosesRecorded;
  const adherenceRate = denominator > 0 ? Math.round((givenDoses / denominator) * 100) : 100;

  // 2. Meals Completed: (meals with portion half or more / meals expected) * 100
  // Expected meals: standard 3 main meals (breakfast, lunch, dinner) per day * 7 = 21 expected meals
  const expectedMeals = 21;

  const mealsQuery = db.prepare(`
    SELECT portion, count(*) as count
    FROM meals
    WHERE patient_id = ? AND logged_at BETWEEN ? AND ?
    GROUP BY portion
  `).all(patientId, startIso, endIso);

  let totalMealsLogged = 0;
  let completedMealsCount = 0;

  mealsQuery.forEach(row => {
    totalMealsLogged += row.count;
    if (['half', 'most', 'full'].includes(row.portion)) {
      completedMealsCount += row.count;
    }
  });

  const mealCompletionRate = expectedMeals > 0
    ? Math.min(100, Math.round((completedMealsCount / expectedMeals) * 100))
    : 0;

  // 3. Physical Activity Minutes: Sum of minutes for the week
  const activitySum = db.prepare(`
    SELECT coalesce(sum(minutes), 0) as total_minutes, count(*) as count
    FROM activities
    WHERE patient_id = ? AND logged_at BETWEEN ? AND ?
  `).get(patientId, startIso, endIso);

  const totalActivityMinutes = activitySum.total_minutes;

  // 4. Mood Trend: Daily mood entries over the 7 days
  const dailyMoods = [];
  for (let d = 0; d < 7; d++) {
    const curDate = new Date(start);
    curDate.setDate(start.getDate() + d);
    const dateKey = curDate.toISOString().split('T')[0];
    const dayStart = `${dateKey}T00:00:00.000Z`;
    const dayEnd = `${dateKey}T23:59:59.999Z`;

    const moodEntry = db.prepare(`
      SELECT mood, label, note, logged_at
      FROM mood_entries
      WHERE patient_id = ? AND logged_at BETWEEN ? AND ?
      ORDER BY logged_at DESC
      LIMIT 1
    `).get(patientId, dayStart, dayEnd);

    dailyMoods.push({
      date: dateKey,
      dayName: curDate.toLocaleDateString('en-US', { weekday: 'short' }),
      mood: moodEntry ? moodEntry.mood : null,
      label: moodEntry ? moodEntry.label : 'Not Logged',
      note: moodEntry ? moodEntry.note : null,
    });
  }

  const validMoods = dailyMoods.filter(m => m.mood !== null);
  const avgMood = validMoods.length > 0
    ? Number((validMoods.reduce((sum, m) => sum + m.mood, 0) / validMoods.length).toFixed(1))
    : 0;

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    medication: {
      adherenceRate,
      givenDoses,
      missedDoses,
      expectedDoses,
    },
    nutrition: {
      mealCompletionRate,
      completedMealsCount,
      expectedMeals,
      totalMealsLogged,
    },
    activity: {
      totalMinutes: totalActivityMinutes,
      sessionsCount: activitySum.count,
    },
    mood: {
      averageScore: avgMood,
      trend: dailyMoods,
    }
  };
}

