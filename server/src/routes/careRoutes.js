import express from 'express';
import { authenticate, authorizePatientAccess } from '../middleware/auth.js';
import {
  getDailyLog,
  getCalendarDots,
  createVital,
  updateVital,
  deleteVital,
  createMeal,
  updateMeal,
  deleteMeal,
  createWaterIntake,
  deleteWaterIntake,
  logMedicineDose,
  createActivity,
  updateActivity,
  deleteActivity,
  logMood,
  createObservation,
  deleteObservation,
  uploadPhotoHandler,
  deletePhoto
} from '../controllers/careController.js';
import uploadPhoto from '../middleware/upload.js';
import { getVitalsCharts, getWeeklyReport, downloadDoctorPdfReport } from '../controllers/analyticsController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// 1. Daily Aggregated Log & Calendar Dots (Accessible by both assigned Nurses and linked Families)
router.get('/daily', authorizePatientAccess({ write: false }), getDailyLog);
router.get('/calendar-dots', authorizePatientAccess({ write: false }), getCalendarDots);

// 2. Analytics & Visualizations (Accessible by both assigned Nurses and linked Families)
router.get('/charts/vitals', authorizePatientAccess({ write: false }), getVitalsCharts);
router.get('/reports/weekly', authorizePatientAccess({ write: false }), getWeeklyReport);
router.get('/reports/pdf', authorizePatientAccess({ write: false }), downloadDoctorPdfReport);

// 2. Vitals Write Operations (Nurses ONLY - Family users get 403)
router.post('/vitals', authorizePatientAccess({ write: true }), createVital);
router.put('/vitals/:id', authorizePatientAccess({ write: true }), updateVital);
router.delete('/vitals/:id', authorizePatientAccess({ write: true }), deleteVital);

// 3. Meals Write Operations (Nurses ONLY)
router.post('/meals', authorizePatientAccess({ write: true }), createMeal);
router.put('/meals/:id', authorizePatientAccess({ write: true }), updateMeal);
router.delete('/meals/:id', authorizePatientAccess({ write: true }), deleteMeal);

// 4. Water Intake Write Operations (Nurses ONLY)
router.post('/water', authorizePatientAccess({ write: true }), createWaterIntake);
router.delete('/water/:id', authorizePatientAccess({ write: true }), deleteWaterIntake);

// 5. Medicine Dose Administration (Nurses ONLY)
router.post('/medicines/doses', authorizePatientAccess({ write: true }), logMedicineDose);

// 6. Activities Write Operations (Nurses ONLY)
router.post('/activities', authorizePatientAccess({ write: true }), createActivity);
router.put('/activities/:id', authorizePatientAccess({ write: true }), updateActivity);
router.delete('/activities/:id', authorizePatientAccess({ write: true }), deleteActivity);

// 7. Mood Entries (Nurses ONLY)
router.post('/mood', authorizePatientAccess({ write: true }), logMood);

// 8. Nurse Observations (Nurses ONLY)
router.post('/observations', authorizePatientAccess({ write: true }), createObservation);
router.delete('/observations/:id', authorizePatientAccess({ write: true }), deleteObservation);

// 9. Photo Attachments (Nurses ONLY - Multer size/type limits)
router.post('/photos', authorizePatientAccess({ write: true }), uploadPhoto.single('photo'), uploadPhotoHandler);
router.delete('/photos/:id', authorizePatientAccess({ write: true }), deletePhoto);

export default router;

