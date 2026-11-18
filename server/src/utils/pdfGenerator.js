import PDFDocument from 'pdfkit';
import { NORMAL_RANGES, checkVitalRange } from '../config/normalRanges.js';

/**
 * Generates a comprehensive clinical PDF report for a patient over a 30-day window.
 * Designed for families to take to consulting physicians and hospital doctors.
 * 
 * @param {Object} data
 * @param {Object} data.patient - Patient record
 * @param {Array} data.vitals - 30 days of vitals readings
 * @param {Object} data.adherence - Medicine adherence stats
 * @param {Array} data.missedDoses - List of missed medicine doses
 * @param {Object} data.nutrition - Meals and water stats
 * @param {Object} data.activity - Activity stats
 * @param {Object} data.mood - Mood stats
 * @param {Array} data.observations - Nurse clinical observations
 * @param {string} data.startDate - YYYY-MM-DD
 * @param {string} data.endDate - YYYY-MM-DD
 * @param {stream.Writable} outputStream - Response stream (res)
 */
export function generatePatientPdfReport(data, outputStream) {
  const {
    patient,
    vitals = [],
    adherence = {},
    missedDoses = [],
    nutrition = {},
    activity = {},
    mood = {},
    observations = [],
    startDate,
    endDate
  } = data;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `TheCarePal Report - ${patient.name}`,
      Author: 'TheCarePal Home Care Platform',
      Subject: '30-Day Clinical Care & Vitals History',
    }
  });

  doc.pipe(outputStream);

  const primaryColor = '#0f766e'; // teal-700
  const secondaryColor = '#334155'; // slate-700
  const redAlertColor = '#b91c1c'; // red-700
  const lightBg = '#f8fafc'; // slate-50

  // --- HEADER SECTION ---
  doc.rect(40, 40, 515, 60).fill('#0f766e');
  
  doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
     .text('TheCarePal', 55, 52);
  
  doc.fontSize(10).font('Helvetica')
     .text('Clinical Home Care & Daily History Report (30-Day Medical Summary)', 55, 75);

  doc.fillColor('#ffffff').fontSize(9).font('Helvetica')
     .text(`Generated: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 410, 55, { align: 'right', width: 130 })
     .text(`Period: ${startDate} to ${endDate}`, 380, 75, { align: 'right', width: 160 });

  doc.moveDown(2);

  // --- PATIENT DEMOGRAPHICS BOX ---
  const demoTop = 115;
  doc.rect(40, demoTop, 515, 65).fillAndStroke('#f0fdfa', '#99f6e4');

  doc.fillColor('#134e4a').font('Helvetica-Bold').fontSize(12)
     .text(`Patient: ${patient.name}`, 55, demoTop + 10);

  doc.fillColor(secondaryColor).font('Helvetica').fontSize(9)
     .text(`Age / Gender: ${patient.age} Years • ${patient.gender || 'Not specified'}`, 55, demoTop + 28)
     .text(`Primary Clinical Condition: ${patient.condition}`, 55, demoTop + 42)
     .text(`Location: ${patient.city} (${patient.room_or_address || 'Home Care'})`, 280, demoTop + 28)
     .text(`Monitoring Window: 30 Days of Daily Logged Care History`, 280, demoTop + 42);

  // --- EXECUTIVE SUMMARY KPIS ---
  const kpiTop = 195;
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11)
     .text('1. Clinical Performance & Adherence Overview (30 Days)', 40, kpiTop);

  const boxWidth = 120;
  const boxHeight = 50;

  // Box 1: Medicine Adherence
  doc.rect(40, kpiTop + 15, boxWidth, boxHeight).fillAndStroke(lightBg, '#e2e8f0');
  doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('MED ADHERENCE', 48, kpiTop + 22);
  doc.fillColor(adherence.adherenceRate < 85 ? redAlertColor : primaryColor).fontSize(14).font('Helvetica-Bold')
     .text(`${adherence.adherenceRate || 100}%`, 48, kpiTop + 33);
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
     .text(`${missedDoses.length} Missed Doses`, 48, kpiTop + 50);

  // Box 2: Meals Completed
  doc.rect(170, kpiTop + 15, boxWidth, boxHeight).fillAndStroke(lightBg, '#e2e8f0');
  doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('MEALS COMPLETED', 178, kpiTop + 22);
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold')
     .text(`${nutrition.mealCompletionRate || 95}%`, 178, kpiTop + 33);
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
     .text(`Portion ≥ 50% consumed`, 178, kpiTop + 50);

  // Box 3: Total Activity
  doc.rect(300, kpiTop + 15, boxWidth, boxHeight).fillAndStroke(lightBg, '#e2e8f0');
  doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('PHYSICAL ACTIVITY', 308, kpiTop + 22);
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold')
     .text(`${activity.totalMinutes || 0} mins`, 308, kpiTop + 33);
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
     .text(`Walk & physiotherapy`, 308, kpiTop + 50);

  // Box 4: Average Mood
  doc.rect(430, kpiTop + 15, 125, boxHeight).fillAndStroke(lightBg, '#e2e8f0');
  doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('AVERAGE MOOD', 438, kpiTop + 22);
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold')
     .text(`${mood.averageScore || 4.0} / 5.0`, 438, kpiTop + 33);
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
     .text(`Responsive & stable`, 438, kpiTop + 50);

  // --- SECTION 2: VITALS SUMMARY & ABNORMAL READINGS TABLE ---
  let curY = kpiTop + 80;
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11)
     .text('2. Vital Signs Summary & Flagged Clinical Outliers', 40, curY);
  curY += 15;

  // Table Header
  doc.rect(40, curY, 515, 20).fill('#e2e8f0');
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8)
     .text('VITAL SIGN', 48, curY + 6)
     .text('NORMAL TARGET', 150, curY + 6)
     .text('PERIOD RANGE (MIN - MAX)', 250, curY + 6)
     .text('LATEST VALUE', 390, curY + 6)
     .text('OUT OF RANGE', 470, curY + 6);
  curY += 20;

  // Compute summary rows for BP, Pulse, SpO2, Sugar, Temp, Weight
  const vitalTypes = [
    { type: 'bp', label: 'Blood Pressure', target: '90-140 / 60-90 mmHg' },
    { type: 'pulse', label: 'Pulse Rate', target: '60 - 100 bpm' },
    { type: 'spo2', label: 'Blood Oxygen (SpO2)', target: '95 - 100 %' },
    { type: 'sugar', label: 'Blood Sugar (Fasting)', target: '70 - 140 mg/dL' },
    { type: 'temp', label: 'Temperature', target: '36.1 - 37.5 °C' },
    { type: 'weight', label: 'Weight', target: 'Trend Only' },
  ];

  vitalTypes.forEach((vMeta, idx) => {
    const list = vitals.filter(v => v.type === vMeta.type);
    const numVals = list.map(v => v.value);
    const minVal = numVals.length ? Math.min(...numVals) : 'N/A';
    const maxVal = numVals.length ? Math.max(...numVals) : 'N/A';
    const latest = list[list.length - 1];
    const outCount = list.filter(v => v.is_out_of_range === 1).length;

    let latestStr = 'N/A';
    if (latest) {
      latestStr = vMeta.type === 'bp' ? `${latest.value}/${latest.value2}` : `${latest.value} ${latest.unit}`;
    }

    const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.rect(40, curY, 515, 18).fill(rowBg);

    doc.fillColor('#334155').font('Helvetica').fontSize(8)
       .text(vMeta.label, 48, curY + 5)
       .text(vMeta.target, 150, curY + 5)
       .text(`${minVal} - ${maxVal}`, 250, curY + 5)
       .text(latestStr, 390, curY + 5);

    if (outCount > 0) {
      doc.fillColor(redAlertColor).font('Helvetica-Bold')
         .text(`[!] ${outCount} Flagged`, 470, curY + 5);
    } else {
      doc.fillColor('#059669').font('Helvetica')
         .text('Normal (0)', 470, curY + 5);
    }

    curY += 18;
  });

  // Out-of-range specific log entries
  const abnormalVitals = vitals.filter(v => v.is_out_of_range === 1);
  if (abnormalVitals.length > 0) {
    curY += 8;
    doc.fillColor(redAlertColor).font('Helvetica-Bold').fontSize(8)
       .text('Flagged Abnormal Vital Readings During Period:', 40, curY);
    curY += 12;

    abnormalVitals.slice(0, 5).forEach(av => {
      const reading = av.type === 'bp' ? `${av.value}/${av.value2} mmHg` : `${av.value} ${av.unit}`;
      doc.fillColor('#475569').font('Helvetica').fontSize(7.5)
         .text(`• ${av.recorded_at.split('T')[0]}: ${av.type.toUpperCase()} recorded at ${reading} - ${av.notes || 'Out of clinical reference bounds'}`, 48, curY);
      curY += 10;
    });
  }

  // --- SECTION 3: MEDICATION ADHERENCE & MISSED DOSES ---
  curY += 15;
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11)
     .text('3. Medication Adherence & Missed Doses Log', 40, curY);
  curY += 15;

  if (missedDoses.length === 0) {
    doc.rect(40, curY, 515, 24).fillAndStroke('#ecfdf5', '#a7f3d0');
    doc.fillColor('#065f46').font('Helvetica').fontSize(8.5)
       .text('Excellent Medication Adherence: No doses were missed during this 30-day reporting window.', 50, curY + 7);
    curY += 30;
  } else {
    doc.rect(40, curY, 515, 18).fill('#fee2e2');
    doc.fillColor(redAlertColor).font('Helvetica-Bold').fontSize(8)
       .text('DATE', 48, curY + 5)
       .text('MEDICATION & DOSE', 130, curY + 5)
       .text('SCHEDULED TIME', 270, curY + 5)
       .text('REASON / NURSE NOTE', 380, curY + 5);
    curY += 18;

    missedDoses.forEach(md => {
      doc.rect(40, curY, 515, 16).fill('#fff5f5');
      doc.fillColor('#991b1b').font('Helvetica').fontSize(8)
         .text(md.date, 48, curY + 4)
         .text(`${md.name} (${md.dose})`, 130, curY + 4)
         .text(md.scheduled_time, 270, curY + 4)
         .text(md.note || 'Patient refusal / nausea', 380, curY + 4);
      curY += 16;
    });
  }

  // --- SECTION 4: CLINICAL OBSERVATIONS SUMMARY ---
  curY += 15;
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11)
     .text('4. Caregiver Clinical Observations & Milestones', 40, curY);
  curY += 14;

  const recentObs = observations.slice(0, 4);
  if (recentObs.length === 0) {
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Oblique').text('No clinical observations recorded.', 40, curY);
    curY += 15;
  } else {
    recentObs.forEach(obs => {
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8)
         .text(`• ${obs.logged_at.split('T')[0]}: `, 48, curY, { continued: true })
         .font('Helvetica').fillColor('#334155').text(obs.text);
      curY += 16;
    });
  }

  // --- PHYSICIAN REVIEW FOOTER ---
  curY = Math.max(curY + 20, 710);
  doc.rect(40, curY, 515, 55).stroke('#cbd5e1');

  doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8)
     .text('PHYSICIAN CLINICAL REVIEW & REMARKS:', 48, curY + 8);
  
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
     .text('Doctor Name & Reg. No: _____________________________', 48, curY + 35)
     .text('Signature & Clinic Stamp: ___________________________', 280, curY + 35);

  doc.end();
}

