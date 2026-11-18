process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import { checkVitalRange } from '../src/config/normalRanges.js';

test('Clinical Normal Ranges Logic', async (t) => {
  await t.test('detects normal blood pressure', () => {
    const res = checkVitalRange('bp', 120, 80);
    assert.equal(res.isOutOfRange, false);
  });

  await t.test('detects high blood pressure', () => {
    const res = checkVitalRange('bp', 150, 95);
    assert.equal(res.isOutOfRange, true);
    assert.equal(res.severity, 'high');
  });

  await t.test('detects low SpO2 (hypoxemia)', () => {
    const res = checkVitalRange('spo2', 92);
    assert.equal(res.isOutOfRange, true);
    assert.equal(res.severity, 'low');
  });

  await t.test('detects high fasting blood sugar', () => {
    const res = checkVitalRange('sugar', 180);
    assert.equal(res.isOutOfRange, true);
  });

  await t.test('detects fever', () => {
    const res = checkVitalRange('temp', 38.5);
    assert.equal(res.isOutOfRange, true);
    assert.equal(res.severity, 'high');
  });
});

test('Authentication & Role-Based Patient Access Control', async (t) => {
  let nurse1Token = '';
  let nurse2Token = '';
  let family1Token = '';
  let family2Token = '';

  await t.test('Nurse 1 login succeeds and returns accessible patients', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nurse1@demo.com', password: 'Demo@123' });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, 'nurse');
    nurse1Token = res.body.token;

    const patientIds = res.body.accessiblePatients.map(p => p.id);
    assert.ok(patientIds.includes('patient-a'));
    assert.ok(patientIds.includes('patient-b'));
    assert.ok(!patientIds.includes('patient-c'));
  });

  await t.test('Nurse 2 login succeeds and has only Patient C', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nurse2@demo.com', password: 'Demo@123' });

    assert.equal(res.status, 200);
    nurse2Token = res.body.token;
    const patientIds = res.body.accessiblePatients.map(p => p.id);
    assert.deepEqual(patientIds, ['patient-c']);
  });

  await t.test('Family 1 login succeeds and has Patient A only', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'family1@demo.com', password: 'Demo@123' });

    assert.equal(res.status, 200);
    family1Token = res.body.token;
    assert.equal(res.body.user.role, 'family');
    const patientIds = res.body.accessiblePatients.map(p => p.id);
    assert.deepEqual(patientIds, ['patient-a']);
  });

  await t.test('Nurse 1 can read assigned Patient A', async () => {
    const res = await request(app)
      .get('/api/patients/patient-a')
      .set('Authorization', `Bearer ${nurse1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.id, 'patient-a');
    assert.equal(res.body.name, 'Ramesh Sharma');
  });

  await t.test('Nurse 1 CANNOT read unassigned Patient C (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/patients/patient-c')
      .set('Authorization', `Bearer ${nurse1Token}`);

    assert.equal(res.status, 403);
    assert.match(res.body.error, /not assigned/i);
  });

  await t.test('Family 1 can read linked Patient A', async () => {
    const res = await request(app)
      .get('/api/patients/patient-a')
      .set('Authorization', `Bearer ${family1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.id, 'patient-a');
  });

  await t.test('Family 1 CANNOT read unlinked Patient C (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/patients/patient-c')
      .set('Authorization', `Bearer ${family1Token}`);

    assert.equal(res.status, 403);
    assert.match(res.body.error, /not authorized/i);
  });

  await t.test('Reject unauthenticated requests to protected patient routes (401)', async () => {
    const res = await request(app).get('/api/patients/patient-a');
    assert.equal(res.status, 401);
  });
});

