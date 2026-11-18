import React from 'react';
import { Activity, Utensils, Pill, Footprints, Smile, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export default function DayOverviewCards({ dailyData }) {
  if (!dailyData) return null;

  const { vitals = [], meals = [], water = { totalMl: 0 }, medicines = [], activities = { totalMinutes: 0 }, moods = [], observations = [] } = dailyData;

  const latestBp = vitals.find(v => v.type === 'bp');
  const latestPulse = vitals.find(v => v.type === 'pulse');
  const latestSpo2 = vitals.find(v => v.type === 'spo2');
  const latestSugar = vitals.find(v => v.type === 'sugar');
  const abnormalVitals = vitals.filter(v => v.is_out_of_range === 1);

  const medsGiven = medicines.filter(m => m.doseRecord?.status === 'given').length;
  const medsMissed = medicines.filter(m => m.doseRecord?.status === 'missed').length;
  const medsTotal = medicines.length;

  const latestMood = moods[0];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Vitals Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vitals</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            {latestBp ? (
              <div className="text-sm font-bold text-slate-900">
                BP: {latestBp.value}/{latestBp.value2} <span className="text-[11px] font-normal text-slate-500">mmHg</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400">No BP recorded</div>
            )}

            <div className="flex flex-wrap gap-x-2 text-[11px] text-slate-600">
              {latestSpo2 && <span>SpO2: <strong>{latestSpo2.value}%</strong></span>}
              {latestPulse && <span>Pulse: <strong>{latestPulse.value}</strong></span>}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          {abnormalVitals.length > 0 ? (
            <span className="text-red-700 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              {abnormalVitals.length} abnormal
            </span>
          ) : vitals.length > 0 ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              All within normal
            </span>
          ) : (
            <span className="text-slate-400">No vitals today</span>
          )}
        </div>
      </div>

      {/* 2. Medication Adherence Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medicines</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Pill className="w-4 h-4" />
            </div>
          </div>

          <div className="text-lg font-bold text-slate-900">
            {medsGiven} / {medsTotal}{' '}
            <span className="text-xs font-normal text-slate-500">Given</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${medsMissed > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${medsTotal > 0 ? (medsGiven / medsTotal) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 text-[11px]">
          {medsMissed > 0 ? (
            <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              {medsMissed} dose missed
            </span>
          ) : medsTotal > 0 && medsGiven === medsTotal ? (
            <span className="text-emerald-700 font-semibold">100% adherence today</span>
          ) : (
            <span className="text-slate-400">{medsTotal - medsGiven} pending</span>
          )}
        </div>
      </div>

      {/* 3. Meals & Hydration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nutrition</span>
            <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
              <Utensils className="w-4 h-4" />
            </div>
          </div>

          <div className="text-sm font-bold text-slate-900">
            {meals.length} Meals Logged
          </div>

          <div className="text-xs text-sky-700 font-medium mt-1">
            💧 {water.totalMl || 0} ml water
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          {meals.length > 0 ? (
            <span className="capitalize">{meals[meals.length - 1].type} recorded</span>
          ) : (
            <span>No meals logged</span>
          )}
        </div>
      </div>

      {/* 4. Mood & Activity Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wellbeing</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Smile className="w-4 h-4" />
            </div>
          </div>

          <div className="text-sm font-bold text-slate-900 truncate">
            {latestMood ? `${latestMood.label.split('/')[0].trim()}` : 'No mood logged'}
          </div>

          <div className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1">
            <Footprints className="w-3.5 h-3.5 text-emerald-600" />
            <span>{activities.totalMinutes} min activity</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 truncate">
          {observations.length > 0 ? (
            <span>"{observations[0].text.slice(0, 28)}..."</span>
          ) : (
            <span>No nurse notes</span>
          )}
        </div>
      </div>
    </div>
  );
}

