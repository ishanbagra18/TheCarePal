import bcrypt from 'bcryptjs';
import db from './src/db/connection.js';
import initSchema from './src/db/schema.js';
import { checkVitalRange } from './src/config/normalRanges.js';

console.log('🔄 Wiping and recreating TheCarePal database with 35 days of synthetic data...');

// Reset tables
initSchema(db);

db.exec(`
  DELETE FROM alerts;
  DELETE FROM photos;
  DELETE FROM observations;
  DELETE FROM mood_entries;
  DELETE FROM activities;
  DELETE FROM medicine_doses;
  DELETE FROM medicine_schedule;
  DELETE FROM water_intake;
  DELETE FROM meals;
  DELETE FROM vitals;
  DELETE FROM family_links;
  DELETE FROM care_assignments;
  DELETE FROM patients;
  DELETE FROM users;
`);

// 1. Create Demo Users
const passwordHash = bcrypt.hashSync('Demo@123', 10);

const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, password_hash, role, phone)
  VALUES (@id, @name, @email, @password_hash, @role, @phone)
`);

const users = [
  { id: 'user-nurse-1', name: 'Nurse Priya Sharma', email: 'nurse1@demo.com', password_hash: passwordHash, role: 'nurse', phone: '+91 98765 43210' },
  { id: 'user-nurse-2', name: 'Nurse Sunita Patel', email: 'nurse2@demo.com', password_hash: passwordHash, role: 'nurse', phone: '+91 98765 43211' },
  { id: 'user-family-1', name: 'Amit Sharma', email: 'family1@demo.com', password_hash: passwordHash, role: 'family', phone: '+91 98111 22334' },
  { id: 'user-family-2', name: 'Meera Verma', email: 'family2@demo.com', password_hash: passwordHash, role: 'family', phone: '+44 7700 900077' },
];

users.forEach(u => insertUser.run(u));
console.log('✅ Created 4 demo user accounts');

// 2. Create 3 Distinct Patients
const insertPatient = db.prepare(`
  INSERT INTO patients (id, name, age, condition, city, gender, room_or_address)
  VALUES (@id, @name, @age, @condition, @city, @gender, @room_or_address)
`);

const patients = [
  {
    id: 'patient-a',
    name: 'Ramesh Sharma',
    age: 72,
    condition: 'Type-2 Diabetes & Hypertension',
    city: 'Delhi',
    gender: 'Male',
    room_or_address: 'Flat 402, Shivalik Enclave, Saket, New Delhi',
  },
  {
    id: 'patient-b',
    name: 'Kamla Devi',
    age: 68,
    condition: 'Early Alzheimer\'s / Dementia',
    city: 'Jaipur',
    gender: 'Female',
    room_or_address: 'B-12, Vaishali Nagar, Jaipur, Rajasthan',
  },
  {
    id: 'patient-c',
    name: 'Anil Verma',
    age: 64,
    condition: 'Post-Knee Replacement Recovery',
    city: 'Mumbai',
    gender: 'Male',
    room_or_address: '7B, Sagar Tarang, Bandra West, Mumbai',
  },
];

patients.forEach(p => insertPatient.run(p));
console.log('✅ Created 3 realistic clinical patients');

// 3. Nurse Assignments & Family Links
const insertAssignment = db.prepare(`
  INSERT INTO care_assignments (id, nurse_id, patient_id) VALUES (?, ?, ?)
`);
insertAssignment.run('ca-1', 'user-nurse-1', 'patient-a'); // Nurse 1 -> Patient A
insertAssignment.run('ca-2', 'user-nurse-1', 'patient-b'); // Nurse 1 -> Patient B
insertAssignment.run('ca-3', 'user-nurse-2', 'patient-c'); // Nurse 2 -> Patient C

const insertLink = db.prepare(`
  INSERT INTO family_links (id, family_user_id, patient_id, relationship) VALUES (?, ?, ?, ?)
`);
insertLink.run('fl-1', 'user-family-1', 'patient-a', 'Son (Bangalore)');
insertLink.run('fl-2', 'user-family-2', 'patient-c', 'Daughter (London)');
console.log('✅ Configured assignments and family authorization links');

// 4. Medicine Schedules
const insertMedSchedule = db.prepare(`
  INSERT INTO medicine_schedule (id, patient_id, name, dose, scheduled_time, instructions)
  VALUES (@id, @patient_id, @name, @dose, @scheduled_time, @instructions)
`);

const medSchedules = [
  // Ramesh Sharma (Diabetes & BP)
  { id: 'sched-1', patient_id: 'patient-a', name: 'Metformin', dose: '500 mg', scheduled_time: '08:30', instructions: 'With breakfast' },
  { id: 'sched-2', patient_id: 'patient-a', name: 'Telmisartan', dose: '40 mg', scheduled_time: '09:00', instructions: 'Morning after food' },
  { id: 'sched-3', patient_id: 'patient-a', name: 'Glimepiride', dose: '1 mg', scheduled_time: '20:30', instructions: '30 mins before dinner' },

  // Kamla Devi (Alzheimer's)
  { id: 'sched-4', patient_id: 'patient-b', name: 'Donepezil', dose: '5 mg', scheduled_time: '09:00', instructions: 'Morning with water' },
  { id: 'sched-5', patient_id: 'patient-b', name: 'Memantine', dose: '10 mg', scheduled_time: '20:00', instructions: 'Bedtime with warm milk' },
  { id: 'sched-6', patient_id: 'patient-b', name: 'Multivitamin + D3', dose: '1 tab', scheduled_time: '13:30', instructions: 'After lunch' },

  // Anil Verma (Post-surgery knee)
  { id: 'sched-7', patient_id: 'patient-c', name: 'Enoxaparin (Clexane)', dose: '40 mg', scheduled_time: '08:00', instructions: 'Subcutaneous injection for DVT prevention' },
  { id: 'sched-8', patient_id: 'patient-c', name: 'Paracetamol', dose: '650 mg', scheduled_time: '14:00', instructions: 'Post-physiotherapy pain management' },
  { id: 'sched-9', patient_id: 'patient-c', name: 'Calcium + Vit D3', dose: '500 mg', scheduled_time: '20:30', instructions: 'Post dinner' },
];

medSchedules.forEach(m => insertMedSchedule.run(m));
console.log('✅ Created medicine schedules');

// 5. Generate 35 Days of Daily Care History (Relative to today)
const insertVital = db.prepare(`
  INSERT INTO vitals (id, patient_id, nurse_id, recorded_at, type, value, value2, unit, notes, is_out_of_range)
  VALUES (@id, @patient_id, @nurse_id, @recorded_at, @type, @value, @value2, @unit, @notes, @is_out_of_range)
`);

const insertMeal = db.prepare(`
  INSERT INTO meals (id, patient_id, nurse_id, type, description, portion, logged_at, notes)
  VALUES (@id, @patient_id, @nurse_id, @type, @description, @portion, @logged_at, @notes)
`);

const insertWater = db.prepare(`
  INSERT INTO water_intake (id, patient_id, nurse_id, ml, logged_at)
  VALUES (@id, @patient_id, @nurse_id, @ml, @logged_at)
`);

const insertDose = db.prepare(`
  INSERT INTO medicine_doses (id, schedule_id, patient_id, nurse_id, date, status, time_given, note, recorded_at)
  VALUES (@id, @schedule_id, @patient_id, @nurse_id, @date, @status, @time_given, @note, @recorded_at)
`);

const insertActivity = db.prepare(`
  INSERT INTO activities (id, patient_id, nurse_id, type, minutes, note, logged_at)
  VALUES (@id, @patient_id, @nurse_id, @type, @minutes, @note, @logged_at)
`);

const insertMood = db.prepare(`
  INSERT INTO mood_entries (id, patient_id, nurse_id, mood, label, note, logged_at)
  VALUES (@id, @patient_id, @nurse_id, @mood, @label, @note, @logged_at)
`);

const insertObs = db.prepare(`
  INSERT INTO observations (id, patient_id, nurse_id, text, logged_at)
  VALUES (@id, @patient_id, @nurse_id, @text, @logged_at)
`);

const insertAlert = db.prepare(`
  INSERT INTO alerts (id, patient_id, kind, message, sent_at, channel, reference_id)
  VALUES (@id, @patient_id, @kind, @message, @sent_at, @channel, @reference_id)
`);

const breakfastDishes = [
  'Poha with roasted peanuts, curry leaves & mint chutney',
  '2 Idlis with hot sambar and fresh coconut chutney',
  'Moong dal chilla with grated paneer and mint chutney',
  'Vegetable suji upma with light curd',
  'Methi thepla (2) with homemade fresh dahi'
];

const lunchDishes = [
  '2 Phulkas, yellow moong dal tadka, bhindi masala & cucumber raita',
  'Steamed jeera rice, Punjabi rajma curry, spinach saag & fresh salad',
  '2 Multigrain rotis, paneer bhurji, mix sprout salad & buttermilk',
  'Moong dal khichdi with a spoon of cow ghee, roasted papad & curd',
  '2 Chapattis, mix veg korma, palak dal & tomato cucumber salad'
];

const snackDishes = [
  'Roasted makhana with a warm cup of cardamom green tea',
  'Fresh papaya & pomegranate fruit bowl with chia seeds',
  'Vegetable clear broth soup with 2 digestive marie biscuits',
  'Steamed sprouted moong chaat with lemon and rock salt'
];

const dinnerDishes = [
  '1 Soft phulka, bottle gourd (lauki) sabzi & light yellow dal',
  'Vegetable daliya porridge with tempered jeera & curd',
  'Moong dal khichdi with Gujarati kadhi',
  '1 Bajra roti with methi aloo & glass of chaas'
];

const moodLabels = {
  1: 'Distressed / Agitated',
  2: 'Low / Fatigued',
  3: 'Calm / Resting',
  4: 'Good / Responsive',
  5: 'Cheerful & Energetic'
};

const nurseMapping = {
  'patient-a': 'user-nurse-1',
  'patient-b': 'user-nurse-1',
  'patient-c': 'user-nurse-2'
};

const today = new Date();

// Populate 35 days (day 34 down to 0)
for (let dayOffset = 34; dayOffset >= 0; dayOffset--) {
  const curDate = new Date(today);
  curDate.setDate(today.getDate() - dayOffset);
  const dateStr = curDate.toISOString().split('T')[0];

  for (const patient of patients) {
    const pId = patient.id;
    const nurseId = nurseMapping[pId];

    // Helpers to create realistic UTC ISO times for the day
    const makeTime = (hour, minute = 0) => {
      const d = new Date(curDate);
      d.setHours(hour, minute, 0, 0);
      return d.toISOString();
    };

    // --- 1. VITALS WITH REALISTIC VARIATION & OUT-OF-RANGE ANOMALIES ---
    // Out-of-range simulation targets:
    // Patient A: Day -3 had high sugar (182 mg/dL), Day -12 had BP spike (152/94 mmHg)
    // Patient B: Day -8 had fever (38.4 °C)
    // Patient C: Day -18 had low SpO2 (93%), Day -24 high BP (146/92)

    let bpSys = 120 + (dayOffset % 11) - 5;
    let bpDia = 78 + (dayOffset % 7) - 3;
    let pulse = 72 + (dayOffset % 9) - 4;
    let spo2 = 98 - (dayOffset % 3);
    let sugar = 105 + (dayOffset % 15) - 7;
    let temp = 36.6 + ((dayOffset % 5) * 0.1);
    let weight = pId === 'patient-a' ? 71.5 + (34 - dayOffset) * 0.03 : (pId === 'patient-b' ? 58.2 : 78.4 - (34 - dayOffset) * 0.05);

    // Inject clinical outliers
    if (pId === 'patient-a' && dayOffset === 3) {
      sugar = 182; // Hyperglycemia after wedding event sweets
    }
    if (pId === 'patient-a' && dayOffset === 12) {
      bpSys = 154; bpDia = 96; // Hypertension peak
    }
    if (pId === 'patient-b' && dayOffset === 8) {
      temp = 38.3; // Low-grade fever / UTI suspicion
      pulse = 104; // Tachycardia with fever
    }
    if (pId === 'patient-c' && dayOffset === 18) {
      spo2 = 93; // Hypoxemia post-op exercise fatigue
    }
    if (pId === 'patient-c' && dayOffset === 24) {
      bpSys = 148; bpDia = 94;
    }

    // Insert Vitals
    const bpCheck = checkVitalRange('bp', bpSys, bpDia);
    const bpId = `vital-bp-${pId}-${dayOffset}`;
    insertVital.run({
      id: bpId, patient_id: pId, nurse_id: nurseId, recorded_at: makeTime(8, 30),
      type: 'bp', value: bpSys, value2: bpDia, unit: 'mmHg',
      notes: bpCheck.isOutOfRange ? 'Patient felt mild morning dizziness' : 'Resting morning reading',
      is_out_of_range: bpCheck.isOutOfRange ? 1 : 0
    });
    if (bpCheck.isOutOfRange) {
      insertAlert.run({
        id: `alert-bp-${pId}-${dayOffset}`, patient_id: pId, kind: 'vital_out_of_range',
        message: `High BP Alert: ${bpSys}/${bpDia} mmHg recorded (${bpCheck.reason})`,
        sent_at: makeTime(8, 32), channel: 'in_app', reference_id: bpId
      });
    }

    const pulseCheck = checkVitalRange('pulse', pulse);
    insertVital.run({
      id: `vital-pulse-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, recorded_at: makeTime(8, 32),
      type: 'pulse', value: pulse, value2: null, unit: 'bpm',
      notes: 'Radial pulse measured at rest',
      is_out_of_range: pulseCheck.isOutOfRange ? 1 : 0
    });

    const spo2Check = checkVitalRange('spo2', spo2);
    const spo2Id = `vital-spo2-${pId}-${dayOffset}`;
    insertVital.run({
      id: spo2Id, patient_id: pId, nurse_id: nurseId, recorded_at: makeTime(8, 35),
      type: 'spo2', value: spo2, value2: null, unit: '%',
      notes: 'Measured with pulse oximeter on index finger',
      is_out_of_range: spo2Check.isOutOfRange ? 1 : 0
    });
    if (spo2Check.isOutOfRange) {
      insertAlert.run({
        id: `alert-spo2-${pId}-${dayOffset}`, patient_id: pId, kind: 'vital_out_of_range',
        message: `Low SpO2 Alert: ${spo2}% recorded (${spo2Check.reason})`,
        sent_at: makeTime(8, 36), channel: 'in_app', reference_id: spo2Id
      });
    }

    const sugarCheck = checkVitalRange('sugar', sugar);
    const sugarId = `vital-sugar-${pId}-${dayOffset}`;
    insertVital.run({
      id: sugarId, patient_id: pId, nurse_id: nurseId, recorded_at: makeTime(8, 0),
      type: 'sugar', value: sugar, value2: null, unit: 'mg/dL',
      notes: 'Fasting blood glucose via glucometer',
      is_out_of_range: sugarCheck.isOutOfRange ? 1 : 0
    });
    if (sugarCheck.isOutOfRange) {
      insertAlert.run({
        id: `alert-sugar-${pId}-${dayOffset}`, patient_id: pId, kind: 'vital_out_of_range',
        message: `Fasting Blood Sugar Alert: ${sugar} mg/dL (${sugarCheck.reason})`,
        sent_at: makeTime(8, 5), channel: 'in_app', reference_id: sugarId
      });
    }

    const tempCheck = checkVitalRange('temp', Number(temp.toFixed(1)));
    const tempId = `vital-temp-${pId}-${dayOffset}`;
    insertVital.run({
      id: tempId, patient_id: pId, nurse_id: nurseId, recorded_at: makeTime(12, 15),
      type: 'temp', value: Number(temp.toFixed(1)), value2: null, unit: '°C',
      notes: tempCheck.isOutOfRange ? 'Axillary temp elevated; cold compress administered' : 'Normal body temperature',
      is_out_of_range: tempCheck.isOutOfRange ? 1 : 0
    });
    if (tempCheck.isOutOfRange) {
      insertAlert.run({
        id: `alert-temp-${pId}-${dayOffset}`, patient_id: pId, kind: 'vital_out_of_range',
        message: `Fever Alert: ${temp.toFixed(1)}°C recorded (${tempCheck.reason})`,
        sent_at: makeTime(12, 18), channel: 'in_app', reference_id: tempId
      });
    }

    // Weight logged once every 3 days
    if (dayOffset % 3 === 0) {
      insertVital.run({
        id: `vital-weight-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, recorded_at: makeTime(8, 10),
        type: 'weight', value: Number(weight.toFixed(1)), value2: null, unit: 'kg',
        notes: 'Morning weight before breakfast',
        is_out_of_range: 0
      });
    }

    // --- 2. MEALS & WATER INTAKE ---
    const bPortion = (dayOffset === 8 && pId === 'patient-b') ? 'quarter' : ((dayOffset % 9 === 0) ? 'half' : 'full');
    insertMeal.run({
      id: `meal-b-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, type: 'breakfast',
      description: breakfastDishes[dayOffset % breakfastDishes.length],
      portion: bPortion, logged_at: makeTime(9, 0),
      notes: bPortion === 'quarter' ? 'Ate very little due to fever and nausea' : 'Enjoyed warm breakfast with hot water'
    });

    const lPortion = (dayOffset % 13 === 0) ? 'half' : 'full';
    insertMeal.run({
      id: `meal-l-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, type: 'lunch',
      description: lunchDishes[dayOffset % lunchDishes.length],
      portion: lPortion, logged_at: makeTime(13, 30),
      notes: 'Served with fresh cucumber and warm dal'
    });

    insertMeal.run({
      id: `meal-s-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, type: 'snack',
      description: snackDishes[dayOffset % snackDishes.length],
      portion: 'full', logged_at: makeTime(17, 0),
      notes: 'Evening tea time snack'
    });

    const dPortion = (dayOffset % 7 === 0) ? 'half' : 'most';
    insertMeal.run({
      id: `meal-d-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, type: 'dinner',
      description: dinnerDishes[dayOffset % dinnerDishes.length],
      portion: dPortion, logged_at: makeTime(20, 30),
      notes: 'Light dinner easy to digest'
    });

    // Water logs: 4 times throughout the day
    insertWater.run({ id: `water-1-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, ml: 400, logged_at: makeTime(9, 30) });
    insertWater.run({ id: `water-2-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, ml: 500, logged_at: makeTime(13, 0) });
    insertWater.run({ id: `water-3-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, ml: 400, logged_at: makeTime(17, 30) });
    insertWater.run({ id: `water-4-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId, ml: 350, logged_at: makeTime(21, 0) });

    // --- 3. MEDICINE DOSES (With realistic adherence & a few missed doses) ---
    const patientSchedules = medSchedules.filter(m => m.patient_id === pId);
    for (const sched of patientSchedules) {
      // Simulate occasional missed dose (e.g. Day 5 for Patient A, Day 11 for Patient B, Day 21 for Patient C)
      const isMissed = (pId === 'patient-a' && dayOffset === 5 && sched.id === 'sched-3') ||
                       (pId === 'patient-b' && dayOffset === 11 && sched.id === 'sched-5') ||
                       (pId === 'patient-c' && dayOffset === 21 && sched.id === 'sched-8');

      const doseId = `dose-${sched.id}-${dateStr}`;
      insertDose.run({
        id: doseId,
        schedule_id: sched.id,
        patient_id: pId,
        nurse_id: nurseId,
        date: dateStr,
        status: isMissed ? 'missed' : 'given',
        time_given: isMissed ? null : sched.scheduled_time,
        note: isMissed ? 'Patient refused medication; doctor notified' : 'Given with water on schedule',
        recorded_at: makeTime(parseInt(sched.scheduled_time.split(':')[0], 10), 10)
      });

      if (isMissed) {
        insertAlert.run({
          id: `alert-dose-${sched.id}-${dateStr}`,
          patient_id: pId,
          kind: 'missed_medicine',
          message: `Missed Dose: ${sched.name} (${sched.dose}) scheduled for ${sched.scheduled_time} was marked missed.`,
          sent_at: makeTime(parseInt(sched.scheduled_time.split(':')[0], 10) + 1, 0),
          channel: 'in_app',
          reference_id: doseId
        });
      }
    }

    // --- 4. ACTIVITIES ---
    if (pId === 'patient-c') {
      // Knee recovery focus: physiotherapy
      insertActivity.run({
        id: `act-1-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId,
        type: 'physio', minutes: 35, note: 'Quadriceps strengthening & gentle knee flexion up to 105 degrees',
        logged_at: makeTime(11, 0)
      });
      insertActivity.run({
        id: `act-2-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId,
        type: 'walk', minutes: 15, note: 'Assisted walk with walker along the hallway',
        logged_at: makeTime(17, 30)
      });
    } else if (pId === 'patient-b') {
      // Alzheimer's: gentle walk & memory exercise
      insertActivity.run({
        id: `act-1-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId,
        type: 'walk', minutes: 20, note: 'Gentle garden stroll holding hands, enjoying flowers',
        logged_at: makeTime(10, 0)
      });
      insertActivity.run({
        id: `act-2-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId,
        type: 'exercise', minutes: 15, note: 'Simple chair breathing and seated arm stretches',
        logged_at: makeTime(16, 30)
      });
    } else {
      // Ramesh (Diabetes): brisk morning walk and evening stroll
      insertActivity.run({
        id: `act-1-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId,
        type: 'walk', minutes: 25, note: 'Morning walk in community park at steady pace',
        logged_at: makeTime(7, 30)
      });
      if (dayOffset % 2 === 0) {
        insertActivity.run({
          id: `act-2-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId,
          type: 'exercise', minutes: 20, note: 'Doctor-advised light yoga stretches & pranayama',
          logged_at: makeTime(17, 45)
        });
      }
    }

    // --- 5. MOOD ---
    let moodScore = 4;
    let moodNote = 'Patient is cheerful and cooperative with daily routine.';
    if (dayOffset === 8 && pId === 'patient-b') {
      moodScore = 1;
      moodNote = 'Restless and confused due to elevated body temperature.';
    } else if (dayOffset % 6 === 0) {
      moodScore = 3;
      moodNote = 'Quiet, spent most of the afternoon resting comfortably.';
    } else if (dayOffset % 10 === 0) {
      moodScore = 5;
      moodNote = 'High spirits! Enjoyed video call with family in Bangalore.';
    }

    insertMood.run({
      id: `mood-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId,
      mood: moodScore, label: moodLabels[moodScore], note: moodNote,
      logged_at: makeTime(19, 0)
    });

    // --- 6. NURSE OBSERVATIONS ---
    const obsNotes = [
      'Patient slept peacefully for 7.5 hours. Good hydration maintained throughout the day.',
      'Skin check performed, no pressure points noted. Appetite was good during all meals.',
      'Complained of minor fatigue in late afternoon. Rested for 45 minutes and felt rejuvenated.',
      'Mobility continues to show steady progress. Blood sugar within optimal target after meals.',
      'Interacted actively during the afternoon visit. Family video call boosted emotional well-being.'
    ];

    insertObs.run({
      id: `obs-${pId}-${dayOffset}`, patient_id: pId, nurse_id: nurseId,
      text: obsNotes[dayOffset % obsNotes.length],
      logged_at: makeTime(21, 30)
    });
  }
}

console.log('✅ Generated 35 days of history for all 3 patients across all care categories');
console.log('🎉 Seed complete! Database is fully populated and ready.');

