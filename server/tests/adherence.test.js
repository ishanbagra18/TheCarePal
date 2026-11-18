process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';

test('Weekly Adherence & Vitals Charts Analytics API', async (t) => {
  let familyToken = '';

  // Log in as Family 1 (linked to Patient A)
  const famRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'family1@demo.com', password: 'Demo@123' });
  familyToken = famRes.body.token;

  await t.test('Fetches 7-day vitals chart data with normal ranges', async () => {
    const res = await request(app)
      .get('/api/patients/patient-a/charts/vitals?days=7')
      .set('Authorization', `Bearer ${familyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.days, 7);
    assert.ok(res.body.ranges.bp);
    assert.ok(res.body.ranges.spo2);
    assert.ok(Array.isArray(res.body.vitalsByType.bp));
    assert.ok(Array.isArray(res.body.vitalsByType.sugar));
    assert.ok(res.body.vitalsByType.bp.length > 0);
  });

  await t.test('Fetches 30-day vitals chart data', async () => {
    const res = await request(app)
      .get('/api/patients/patient-a/charts/vitals?days=30')
      .set('Authorization', `Bearer ${familyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.days, 30);
    assert.ok(res.body.vitalsByType.bp.length >= 20);
  });

  await t.test('Calculates weekly adherence, meals, activities & deltas', async () => {
    const res = await request(app)
      .get('/api/patients/patient-a/reports/weekly')
      .set('Authorization', `Bearer ${familyToken}`);

    assert.equal(res.status, 200);
    const { currentWeek, previousWeek, deltas } = res.body;

    assert.ok(typeof currentWeek.medication.adherenceRate === 'number');
    assert.ok(currentWeek.medication.adherenceRate >= 0 && currentWeek.medication.adherenceRate <= 100);

    assert.ok(typeof currentWeek.nutrition.mealCompletionRate === 'number');
    assert.ok(currentWeek.nutrition.mealCompletionRate >= 0 && currentWeek.nutrition.mealCompletionRate <= 100);

    assert.ok(typeof currentWeek.activity.totalMinutes === 'number');
    assert.ok(currentWeek.activity.totalMinutes >= 0);

    assert.ok(Array.isArray(currentWeek.mood.trend));
    assert.equal(currentWeek.mood.trend.length, 7);

    assert.ok('adherenceRate' in deltas);
    assert.ok('mealCompletionRate' in deltas);
    assert.ok('activityMinutes' in deltas);
    assert.ok('moodScore' in deltas);
  });

  await t.test('Family user CANNOT access unlinked patient charts (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/patients/patient-c/charts/vitals?days=7')
      .set('Authorization', `Bearer ${familyToken}`);

    assert.equal(res.status, 403);
  });

  await t.test('Generates and streams 30-day Doctor PDF report', async () => {
    const res = await request(app)
      .get('/api/patients/patient-a/reports/pdf?days=30')
      .set('Authorization', `Bearer ${familyToken}`);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /application\/pdf/i);
    assert.match(res.headers['content-disposition'], /TheCarePal_Report/i);
    assert.ok(res.body.length > 500); // Binary PDF content
  });
});

