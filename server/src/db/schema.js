/**
 * Database schema initialization for TheCarePal
 */

export function initSchema(db) {
  db.exec(`
    -- Users table: Nurses and Family members
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('nurse', 'family')),
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Patients table
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      condition TEXT NOT NULL,
      city TEXT NOT NULL,
      gender TEXT DEFAULT 'Not specified',
      room_or_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Nurse to Patient assignments (Nurses can only access assigned patients)
    CREATE TABLE IF NOT EXISTS care_assignments (
      id TEXT PRIMARY KEY,
      nurse_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (nurse_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      UNIQUE(nurse_id, patient_id)
    );

    -- Family member to Patient links (Family members can only access linked patients)
    CREATE TABLE IF NOT EXISTS family_links (
      id TEXT PRIMARY KEY,
      family_user_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      relationship TEXT DEFAULT 'Family',
      linked_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      UNIQUE(family_user_id, patient_id)
    );

    -- Vitals logged by nurses
    CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      nurse_id TEXT NOT NULL,
      recorded_at TEXT NOT NULL, -- ISO timestamp in UTC
      type TEXT NOT NULL CHECK(type IN ('bp', 'pulse', 'spo2', 'sugar', 'temp', 'weight')),
      value REAL NOT NULL,        -- Systolic for BP, reading for others
      value2 REAL,               -- Diastolic for BP
      unit TEXT NOT NULL,
      notes TEXT,
      is_out_of_range INTEGER DEFAULT 0, -- 1 if abnormal
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (nurse_id) REFERENCES users(id)
    );

    -- Meals logged
    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      nurse_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('breakfast', 'lunch', 'snack', 'dinner')),
      description TEXT NOT NULL,
      portion TEXT NOT NULL CHECK(portion IN ('none', 'quarter', 'half', 'most', 'full')),
      logged_at TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (nurse_id) REFERENCES users(id)
    );

    -- Water intake entries
    CREATE TABLE IF NOT EXISTS water_intake (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      nurse_id TEXT NOT NULL,
      ml INTEGER NOT NULL CHECK(ml > 0),
      logged_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (nurse_id) REFERENCES users(id)
    );

    -- Scheduled daily medicines for a patient
    CREATE TABLE IF NOT EXISTS medicine_schedule (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dose TEXT NOT NULL,
      scheduled_time TEXT NOT NULL, -- e.g. "08:00", "14:00", "20:00"
      instructions TEXT,            -- e.g. "After breakfast", "Before bed"
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    -- Daily administration log for scheduled medicines
    CREATE TABLE IF NOT EXISTS medicine_doses (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      nurse_id TEXT NOT NULL,
      date TEXT NOT NULL,           -- YYYY-MM-DD
      status TEXT NOT NULL CHECK(status IN ('given', 'missed')),
      time_given TEXT,              -- HH:MM or ISO timestamp when administered
      note TEXT,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (schedule_id) REFERENCES medicine_schedule(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (nurse_id) REFERENCES users(id),
      UNIQUE(schedule_id, date)
    );

    -- Physical activities logged
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      nurse_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('walk', 'exercise', 'physio', 'outing', 'other')),
      minutes INTEGER NOT NULL CHECK(minutes > 0),
      note TEXT,
      logged_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (nurse_id) REFERENCES users(id)
    );

    -- Patient mood entries
    CREATE TABLE IF NOT EXISTS mood_entries (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      nurse_id TEXT NOT NULL,
      mood INTEGER NOT NULL CHECK(mood BETWEEN 1 AND 5),
      label TEXT NOT NULL, -- 'Agitated', 'Low', 'Calm', 'Good', 'Cheerful'
      note TEXT,
      logged_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (nurse_id) REFERENCES users(id)
    );

    -- General nurse observations & clinical notes
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      nurse_id TEXT NOT NULL,
      text TEXT NOT NULL,
      logged_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (nurse_id) REFERENCES users(id)
    );

    -- Photo attachments for care events (meals, activities, general)
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      nurse_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      caption TEXT,
      category TEXT DEFAULT 'general',
      logged_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (nurse_id) REFERENCES users(id)
    );

    -- Alerts table (out of range vitals, missed medicines)
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      kind TEXT NOT NULL,        -- 'vital_out_of_range', 'missed_medicine'
      message TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      channel TEXT DEFAULT 'in_app', -- 'in_app', 'email'
      reference_id TEXT,          -- ID of the vital or dose that triggered it
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    -- Query optimization indexes
    CREATE INDEX IF NOT EXISTS idx_vitals_patient_date ON vitals(patient_id, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_meals_patient_date ON meals(patient_id, logged_at);
    CREATE INDEX IF NOT EXISTS idx_water_patient_date ON water_intake(patient_id, logged_at);
    CREATE INDEX IF NOT EXISTS idx_doses_patient_date ON medicine_doses(patient_id, date);
    CREATE INDEX IF NOT EXISTS idx_activities_patient_date ON activities(patient_id, logged_at);
    CREATE INDEX IF NOT EXISTS idx_mood_patient_date ON mood_entries(patient_id, logged_at);
    CREATE INDEX IF NOT EXISTS idx_obs_patient_date ON observations(patient_id, logged_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_patient_date ON alerts(patient_id, sent_at);
  `);
}

export default initSchema;

