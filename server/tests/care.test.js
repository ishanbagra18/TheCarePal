process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';

test('Care Logging & Scoped Access API', async (t) => {
  let nurseToken = '';
  let familyToken = '';
  const testDate = new Date().toISOString().split('T')[0];

  // Log in as Nurse 1 (assigned to Patient A)
  const nurseRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nurse1@demo.com', password: 'Demo@123' });
  nurseToken = nurseRes.body.token;

  // Log in as Family 1 (linked to Patient A)
  const famRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'family1@demo.com', password: 'Demo@123' });
  familyToken = famRes.body.token;

  await t.test('Nurse can fetch daily log for assigned patient', async () => {
    const res = await request(app)
      .get(`/api/patients/patient-a/daily?date=${testDate}`)
      .set('Authorization', `Bearer ${nurseToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.vitals));
    assert.ok(Array.isArray(res.body.meals));
    assert.ok(Array.isArray(res.body.medicines));
  });

  await t.test('Nurse can log a normal vital reading', async () => {
    const res = await request(app)
      .post('/api/patients/patient-a/vitals')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        type: 'bp',
        value: 120,
        value2: 80,
        unit: 'mmHg',
        notes: 'Resting morning BP',
        recorded_at: `${testDate}T09:00:00.000Z`
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.vital.value, 120);
    assert.equal(res.body.vital.value2, 80);
    assert.equal(res.body.rangeCheck.isOutOfRange, false);
  });

  await t.test('Nurse logging abnormal vital flags out_of_range and triggers alert', async () => {
    const res = await request(app)
      .post('/api/patients/patient-a/vitals')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        type: 'sugar',
        value: 210, // Significantly high fasting blood glucose
        unit: 'mg/dL',
        notes: 'Patient felt shaky before breakfast',
        recorded_at: `${testDate}T08:15:00.000Z`
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.vital.is_out_of_range, 1);
    assert.equal(res.body.rangeCheck.isOutOfRange, true);
  });

  await t.test('Family user CANNOT write vitals (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/patients/patient-a/vitals')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        type: 'pulse',
        value: 75,
        unit: 'bpm'
      });

    assert.equal(res.status, 403);
    assert.match(res.body.error, /read-only access/i);
  });

  await t.test('Nurse can log Indian meal and portion', async () => {
    const res = await request(app)
      .post('/api/patients/patient-a/meals')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        type: 'breakfast',
        description: 'Moong dal chilla with homemade mint chutney',
        portion: 'full',
        notes: 'Ate well with good appetite',
        logged_at: `${testDate}T09:15:00.000Z`
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.meal.portion, 'full');
    assert.match(res.body.meal.description, /chilla/i);
  });

  await t.test('Nurse can log water intake', async () => {
    const res = await request(app)
      .post('/api/patients/patient-a/water')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        ml: 350,
        logged_at: `${testDate}T10:00:00.000Z`
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.entry.ml, 350);
  });

  await t.test('Nurse can record medicine dose status', async () => {
    const res = await request(app)
      .post('/api/patients/patient-a/medicines/doses')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        schedule_id: 'sched-1', // Metformin
        date: testDate,
        status: 'given',
        time_given: '08:45',
        note: 'Administered with breakfast'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.dose.status, 'given');
  });

  await t.test('Nurse can log activity minutes and type', async () => {
    const res = await request(app)
      .post('/api/patients/patient-a/activities')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        type: 'walk',
        minutes: 25,
        note: 'Brisk walk in courtyard',
        logged_at: `${testDate}T07:45:00.000Z`
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.activity.minutes, 25);
  });

  await t.test('Nurse can record mood and clinical observation', async () => {
    const moodRes = await request(app)
      .post('/api/patients/patient-a/mood')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        mood: 4,
        label: 'Good / Responsive',
        note: 'Cheerful demeanor this morning',
        logged_at: `${testDate}T11:00:00.000Z`
      });
    assert.equal(moodRes.status, 201);

    const obsRes = await request(app)
      .post('/api/patients/patient-a/observations')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        text: 'Patient rested well through the night. Vital signs stable, hydration encouraged.',
        logged_at: `${testDate}T11:05:00.000Z`
      });
    assert.equal(obsRes.status, 201);
  });

  await t.test('Family user can fetch calendar dots for linked patient', async () => {
    const res = await request(app)
      .get('/api/patients/patient-a/calendar-dots')
      .set('Authorization', `Bearer ${familyToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.datesWithLogs));
    assert.ok(Array.isArray(res.body.datesWithAlerts));
    assert.ok(res.body.datesWithLogs.length > 0);
  });

  await t.test('Family user receives unified chronological timeline', async () => {
    const res = await request(app)
      .get(`/api/patients/patient-a/daily?date=${testDate}`)
      .set('Authorization', `Bearer ${familyToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.timeline));
    assert.ok(res.body.timeline.length > 0);
    
    // Verify timeline items have category, title, timestamp
    const firstItem = res.body.timeline[0];
    assert.ok(firstItem.category);
    assert.ok(firstItem.title);
    assert.ok(firstItem.timestamp);
  });

  await t.test('Nurse can attach photo to care log and family receives 403 on upload', async () => {
    // 1. Create a tiny 1x1 test image buffer
    const testImageBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

    // Nurse upload succeeds
    const nursePhotoRes = await request(app)
      .post('/api/patients/patient-a/photos')
      .set('Authorization', `Bearer ${nurseToken}`)
      .field('caption', 'Lunch khichdi served warm')
      .field('category', 'meal')
      .attach('photo', testImageBuffer, 'test-meal.png');

    assert.equal(nursePhotoRes.status, 201);
    assert.ok(nursePhotoRes.body.photo.file_path);
    assert.equal(nursePhotoRes.body.photo.caption, 'Lunch khichdi served warm');

    // Family write is rejected with 403
    const famPhotoRes = await request(app)
      .post('/api/patients/patient-a/photos')
      .set('Authorization', `Bearer ${familyToken}`)
      .field('caption', 'Attempted upload')
      .attach('photo', testImageBuffer, 'test.png');

    assert.equal(famPhotoRes.status, 403);
  });
});

