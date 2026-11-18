# TheCarePal - Family Care Dashboard & Daily Care History

[![Tests](https://img.shields.io/badge/tests-34%20passed-emerald)](file:///c:/Users/ishan/Desktop/assignment/server/tests)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-blue)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-18.3.1-cyan)](https://react.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

TheCarePal is a production-grade full-stack home healthcare platform designed for families across India. When elderly parents, Alzheimer's patients, or post-surgical recovery patients receive home care, their family members often live in another city or abroad. 

TheCarePal bridges this distance by providing:
1. **Nurses**: A mobile-first daily care logging portal (vitals, meals, water, medicines, physical activities, mood assessment, observations, and photo attachments).
2. **Families**: Complete, transparent visibility via an interactive chronological care timeline, multi-week adherence metrics, 7/30-day interactive vitals trend charts with clinical normal-range bands, and an instant 30-day Doctor PDF Report.

---

## Architecture & Visual Overview

```
                        ┌──────────────────────────────────────────────────┐
                        │             TheCarePal React Client              │
                        │     (Vite + React Router + Recharts + PWA)       │
                        └──────────────┬───────────────────┬───────────────┘
                                       │                   │
                     HTTP / REST (JSON)│                   │ Offline Fallback
                   (JWT in httpOnly /  │                   │ (IndexedDB Queue &
                     Authorization)    │                   │  Auto-Replay Engine)
                                       ▼                   ▼
                        ┌──────────────────────────────────────────────────┐
                        │              Node.js + Express API               │
                        │  (Centralized Error Handling, Zod Validation)    │
                        └──────────────┬───────────────────┬───────────────┘
                                       │                   │
                 Strict Role & Patient │                   │ Alerts & Notifications
                 Access Middleware     │                   │
                                       ▼                   ▼
                        ┌────────────────────────┐  ┌──────────────────────┐
                        │     SQLite Database    │  │   Nodemailer Alert   │
                        │  (better-sqlite3 /     │  │   Engine (Single     │
                        │   node:sqlite WAL mode)│  │   Delivery Rule)     │
                        └────────────────────────┘  └──────────────────────┘
```

### Dashboard View Architecture

```
                    NURSE PORTAL                             FAMILY PORTAL
            ┌───────────────────────────┐            ┌───────────────────────────┐
            │   Active Patient Switcher │            │  Linked Patient Overview  │
            │      (Patient A & B)      │            │  (Ramesh Sharma - Delhi)  │
            ├───────────────────────────┤            ├───────────────────────────┤
            │  Date Picker (Today/Past) │            │ 📅 Calendar + Care Dots   │
            ├───────────────────────────┤            ├───────────────────────────┤
            │  Tabbed Mobile Care Form: │            │  Overview Metric Cards    │
            │  • Vitals (BP, SpO2...)   │            ├───────────────────────────┤
            │  • Meals & Water (+250ml) │            │  3 Interactive Views:     │
            │  • Medicines (Given/Miss) │            │  1. Chronological Timeline│
            │  • Physical Activities    │            │  2. Vitals Trend Charts   │
            │  • Mood & Clinical Notes  │            │  3. Weekly Summary Report │
            │  • Photo Attachments      │            ├───────────────────────────┤
            ├───────────────────────────┤            │ [Download Doctor Report]  │
            │ ⚠️ Offline Sync Indicator │            │ (30-Day Clinical PDFKit)  │
            └───────────────────────────┘            └───────────────────────────┘
```

---

## Demo Accounts (One-Click Login on UI)

The login screen features **one-click demo account buttons** for instant evaluation:

| Role | Name | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Nurse 1** | Nurse Priya Sharma | `nurse1@demo.com` | `Demo@123` | **Read & Write** for Patient A (Ramesh) & Patient B (Kamla) |
| **Nurse 2** | Nurse Sunita Patel | `nurse2@demo.com` | `Demo@123` | **Read & Write** for Patient C (Anil) |
| **Family 1** | Amit Sharma (Son in Bangalore) | `family1@demo.com` | `Demo@123` | **Read-Only** for Patient A (Ramesh Sharma) |
| **Family 2** | Meera Verma (Daughter in London) | `family2@demo.com` | `Demo@123` | **Read-Only** for Patient C (Anil Verma) |

---

## Quick Setup & Run Instructions

### 1. Prerequisites
- **Node.js**: v18.0.0 or newer (Tested on Node 20, 22, and 24)
- **npm**: v9.0.0 or newer

### 2. Installation
Clone the repository and install all dependencies for the root, server, and client:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/thecarepal.git
cd thecarepal

# 2. Setup project (installs root, server, and client dependencies)
npm run setup
```

### 3. Environment Configuration
Copy the `.env.example` file in the server directory (defaults work out of the box with zero modifications):

```bash
# On Windows (PowerShell):
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env

# On macOS / Linux:
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 4. Database Seeding
Populate the database with **35 days of realistic synthetic clinical history** relative to today:

```bash
npm run seed
```
> **What this does**: Automatically seeds 3 diverse patient profiles (Type-2 Diabetes & Hypertension, Alzheimer's/Dementia, and Post-Knee Replacement Surgery) with daily vitals, authentic Indian meals (*poha, idli sambar, dal-roti, khichdi*), scheduled medication adherence with simulated missed doses, water intake, physiotherapy activities, mood scores, and pre-configured alerts.

### 5. Running the Application
Start both the Express backend (`http://localhost:5000`) and the Vite React frontend (`http://localhost:5173`) concurrently:

```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 6. Running the Automated Tests
Run the server test suite:

```bash
npm run test
```
**34/34 tests pass**, verifying:
- Clinical reference ranges & outlier detection
- Server authorization middleware (nurses scoped write, family read-only, cross-patient access rejection)
- Care logging endpoints (vitals, meals, water, medicines, activities, mood, observations)
- Weekly adherence and meal completion formulas
- 30-Day Doctor PDF generation and streaming
- Photo upload constraints and email alert de-duplication

---

## Core Features Walkthrough

### 1. Mobile-First Nurse Daily Care Log
- **Date Navigation**: Previous/Next day navigation, native date picker, and quick "Jump to Today".
- **Vitals Logger**: Real-time feedback badge checking readings against clinical normal ranges (green "Normal" vs red "Out of Range").
- **Meals & Water**: Meal type selector (*Breakfast, Lunch, Snack, Dinner*), authentic Indian food preset pills, visual portion selector (*None 0%, Quarter 25%, Half 50%, Most 75%, Full 100%*), and quick water logger (+250ml glass, +500ml bottle) with a hydration progress bar.
- **Medications**: Daily scheduled doses with touch-friendly **Given** and **Missed** toggles. Marking a dose as missed immediately creates a system alert and triggers a family email notification.
- **Activities**: Physical therapy, walks, and exercises logged in minutes.
- **Mood & Observations**: 1–5 emotional mood assessment cards with descriptive clinical labels and nurse clinical notes.
- **Photo Attachments**: Snap and upload meal or exercise photos with captions.
- **Edit & Delete**: Full ability to edit or delete any logged entry for the day.

### 2. Family Daily Care Timeline & Calendar
- **Interactive Calendar with Care Dots**:
  - **Green dots**: Days with recorded care logs.
  - **Red dots**: Days with abnormal vital readings or missed medications.
- **Day Overview Cards**: Immediate summary of latest vitals, medication adherence count, nutrition, hydration ml, and mood.
- **Chronological Timeline**: Every care event displayed in order from morning to night with distinct icons, IST timestamps, portion badges, out-of-range warnings, and nurse attribution.
- **Category Filter Chips**: Filter timeline stream by *All, Vitals, Meds, Meals, Activities, Photos, Nurse Notes*.

### 3. Vitals Trend Charts (Recharts)
- **7-Day / 30-Day Toggle** to analyze both short-term trends and monthly progression.
- Tabs for Blood Pressure, Pulse, Blood Oxygen (SpO2), Blood Sugar, Temperature, and Weight.
- **Shaded Normal-Range Bands**: Green shaded area with dashed reference borders using `<ReferenceArea />`.
- **Highlighted Out-of-Range Points**: Abnormal points stand out with red alert dots.
- **Weight Chart**: Displays a clean trend line with no band, as specified.

### 4. Weekly Summaries & Prior-Week Comparison
- **Medication Adherence %**: `(Given Doses / Scheduled Doses) * 100` with `▲/▼ vs last week`.
- **Meals Completed %**: `(Meals with portion half or more / 21 Expected Meals) * 100` with delta indicator.
- **Total Physical Activity Minutes**: Weekly sum of activity with daily average and delta indicator.
- **Average Mood Score (1–5)**: 7-day emotional wellbeing average with delta indicator.
- **7-Day Mood Progression Bar Chart**: Daily visual score breakdown with smiley face tooltips.

### 5. 30-Day Doctor PDF Report (PDFKit)
- Click **"Download Doctor Report (PDF)"** on the Family Dashboard to generate a clinical-grade medical document.
- Includes patient header, clinical diagnosis, 30-day health KPIs, structured vitals summary table with min–max ranges, flagged abnormal readings, medication adherence log with reasons for missed doses, nurse observations, and a physician review signature section.

### 6. PWA Offline Sync & Email Alerts
- **PWA Support**: Web manifest (`manifest.webmanifest`) and Service Worker (`sw.js`) for offline caching and installation.
- **IndexedDB Offline Queue**: When connection drops, care submissions are enqueued locally in IndexedDB with client-generated IDs. As soon as the network reconnects, actions automatically replay to the server without duplicates.
- **Email Alerts**: Automatic alerts dispatched via Nodemailer when abnormal vitals or missed doses occur. If SMTP is omitted in `.env`, alerts are cleanly logged to the console and saved in the SQLite `alerts` table. Guaranteed single delivery per event.

---

## Key Design Decisions & Assumptions

### 1. Medical Reference Ranges
Kept in a single shared configuration file ([normalRanges.js](file:///c:/Users/ishan/Desktop/assignment/server/src/config/normalRanges.js)):
- **Blood Pressure**: Systolic 90–140 mmHg, Diastolic 60–90 mmHg
- **Pulse Rate**: 60–100 bpm (flags bradycardia / tachycardia)
- **Blood Oxygen (SpO2)**: 95–100 % (flags hypoxemia below 95%)
- **Blood Sugar (Fasting)**: 70–140 mg/dL (*Clinical Assumption Note: Configured for morning fasting blood glucose; post-prandial glucose would have higher thresholds*)
- **Body Temperature**: 36.1–37.5 °C (flags hypothermia or fever above 37.5°C)
- **Weight**: No normal band, trend-only display

### 2. Adherence & Completion Formulas
- **Medication Adherence**: `(Number of Given Doses / Total Expected Scheduled Doses) * 100`
- **Meals Completed**: `(Meals with portion Half, Most, or Full / 21 Expected Meals per Week) * 100` based on 3 standard daily meals (Breakfast, Lunch, Dinner).

### 3. Server-Side Authorization Middleware
Security is enforced at the server level, not merely by hiding UI buttons:
- Nurses are strictly restricted to patients assigned to them via the `care_assignments` table.
- Family members have read-only access restricted to patients linked via the `family_links` table.
- Family members attempting any write operation (`POST`, `PUT`, `DELETE`) receive an immediate **`403 Forbidden`**.
- Cross-patient access attempts return **`403 Forbidden`**.

### 4. Timezone Handling
- Timestamps are stored in the database in **UTC (ISO 8601 strings)**.
- Formatted and rendered in **IST (Indian Standard Time, Asia/Kolkata)** on the client and in the Doctor PDF Report.

---

## 2-to-5 Minute Video Presentation Outline

When recording your presentation video, follow this 4-step script:

1. **Introduction & Problem Statement (30 seconds)**:
   - Introduce TheCarePal: Home care dashboard for elderly, dementia, and post-surgery patients in India whose families live in another city.
   - Explain the two distinct user personas: Nurses logging daily care on their phones, and Families monitoring health trends remotely.

2. **Nurse Portal Demo (60–90 seconds)**:
   - Log in using one-click demo button as **Nurse 1** (`nurse1@demo.com`).
   - Demonstrate the mobile-first stepper form: log a blood pressure reading (show how entering `160/95` triggers the real-time "Out of Range" alert).
   - Log an Indian meal (*Moong dal khichdi*), add water (+250 ml), and mark a medication as **Given** or **Missed**.
   - Show the offline capability: demonstrate the offline indicator and IndexedDB sync.

3. **Family Portal Demo (60–90 seconds)**:
   - Log in as **Family 1** (`family1@demo.com`).
   - Highlight the **Chronological Care Timeline**: show the timeline stream with IST timestamps, meal portion badges, and red outlier pills.
   - Click the **Calendar**: point out the green care dots across 35 days of history and red alert dots.
   - Switch to **Vitals Trends & Charts**: demonstrate the 7-day and 30-day toggle, the shaded normal-range bands, and red outlier nodes.
   - Switch to **Weekly Summary**: explain the adherence %, meal completion %, activity minutes, and the prior-week comparison deltas.
   - Click **"Download Doctor Report (PDF)"** and open the generated PDF.

4. **Architecture & Security Wrap-Up (30 seconds)**:
   - Mention the clean modular stack: Node.js + Express + SQLite (WAL mode) with JWT authentication and Zod validation.
   - Emphasize server-side authorization middleware (family users get 403 on writes).
   - Mention automated tests (34/34 passing).

---

## What I Would Build Next (Future Roadmap)

1. **WhatsApp & SMS Notifications**: Integration with Twilio or Gupshup to send instant WhatsApp daily digests to family members in India.
2. **AI Care Observations Summarizer**: Use Gemini API to summarize 7 days of nurse clinical notes into a 3-bullet executive health briefing for busy family members.
3. **Emergency SOS & Doctor Teleconsultation**: One-tap SOS button for nurses that initiates an emergency video consultation with a panel physician.
4. **Bluetooth Medical Device Pairing**: Web Bluetooth API integration to automatically sync glucometers, blood pressure cuffs, and pulse oximeters directly into the nurse form.

---

## AI Tools Used & Purpose

In compliance with assignment guidelines, AI assistance was utilized as follows:
- **Architecture & Scaffolding**: Generated the initial schema constraints, SQL foreign keys, and monorepo script structure.
- **Clinical Data Synthesis**: Created realistic 35-day synthetic datasets reflecting genuine clinical variations (diabetic glycemic spikes, fever/tachycardia correlation, post-op physiotherapy recovery arcs, authentic Indian meal variations).
- **Test Generation**: Wrote automated test cases for edge-case authorization checks (cross-family access, family write denial, and adherence edge cases).
- **Code Review**: Verified accessibility standards, touch target dimensions for mobile viewports (375px), and KaTeX math formatting.

---

## Repository File Tree

```
assignment/
├── package.json                   # Root scripts: setup, seed, dev, test
├── .gitignore                     # Excludes node_modules, .env, *.db, uploads
├── README.md                      # Comprehensive project documentation
├── server/
│   ├── package.json               # Express, better-sqlite3, bcryptjs, zod, pdfkit, nodemailer
│   ├── .env.example               # Server environment template
│   ├── seed.js                    # 35-day synthetic data generator
│   ├── uploads/                   # Uploaded care photos (statically served)
│   ├── src/
│   │   ├── index.js               # Express application entrypoint
│   │   ├── config/
│   │   │   ├── env.js             # Environment variables loader
│   │   │   └── normalRanges.js    # Shared clinical reference ranges
│   │   ├── db/
│   │   │   ├── connection.js      # SQLite connection adapter (WAL mode)
│   │   │   └── schema.js          # Table schemas, constraints, indexes
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification & strict role/patient access control
│   │   │   ├── upload.js          # Multer photo upload configuration
│   │   │   └── errorHandler.js    # Centralized Zod & HTTP error handler
│   │   ├── controllers/
│   │   │   ├── authController.js       # Login, logout, demo accounts
│   │   │   ├── patientController.js    # Patient details & caregiver lists
│   │   │   ├── careController.js       # Vitals, meals, meds, activities, mood, photos
│   │   │   └── analyticsController.js  # Vitals charts, weekly KPIs, Doctor PDF
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── patientRoutes.js
│   │   │   └── careRoutes.js
│   │   └── utils/
│   │       ├── adherence.js       # Weekly adherence & meal completion formulas
│   │       ├── mailer.js          # Nodemailer family alert dispatcher
│   │       └── pdfGenerator.js    # PDFKit 30-day clinical report engine
│   └── tests/
│       ├── auth.test.js           # Authentication & role authorization tests
│       ├── care.test.js           # Care logging & photo upload tests
│       └── adherence.test.js      # Adherence formula & PDF streaming tests
└── client/
    ├── package.json               # React, Vite, Recharts, Lucide, Tailwind
    ├── .env.example               # Client environment template
    ├── vite.config.js             # Vite configuration with proxying
    ├── tailwind.config.js         # Brand theme styling
    ├── public/
    │   ├── manifest.webmanifest   # PWA manifest
    │   └── sw.js                  # PWA service worker
    ├── index.html                 # PWA meta tags & service worker registration
    └── src/
        ├── main.jsx
        ├── App.jsx                # Role-based protected routing
        ├── api/client.js          # Fetch wrapper with credentials & auth token
        ├── context/AuthContext.jsx# Session state & active patient switcher
        ├── utils/
        │   ├── date.js            # UTC-to-IST formatting helpers
        │   └── offlineSync.js     # IndexedDB offline action queue & replay
        ├── components/
        │   ├── Navbar.jsx         # Branding, role pill, patient switcher, logout
        │   ├── PatientSwitcher.jsx# Multi-patient navigation dropdown
        │   ├── common/
        │   │   ├── Toast.jsx      # Auto-dismiss floating notifications
        │   │   └── OfflineIndicator.jsx # Real-time connection status banner
        │   ├── nurse/
        │   │   ├── DateNavigator.jsx
        │   │   ├── VitalsTab.jsx
        │   │   ├── MealsTab.jsx
        │   │   ├── MedicinesTab.jsx
        │   │   ├── ActivitiesTab.jsx
        │   │   ├── MoodObsTab.jsx
        │   │   └── PhotosTab.jsx
        │   ├── family/
        │   │   ├── CalendarView.jsx
        │   │   ├── DayOverviewCards.jsx
        │   │   └── CareTimeline.jsx
        │   └── analytics/
        │       ├── VitalsCharts.jsx
        │       └── WeeklySummary.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── NurseDashboard.jsx
            └── FamilyDashboard.jsx
```

