import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import api from '../../api/client';
import {
  Calendar,
  Pill,
  Utensils,
  Footprints,
  Smile,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const MOOD_EMOJIS = {
  1: '😫 Distressed',
  2: '😔 Low / Fatigued',
  3: '😐 Calm / Resting',
  4: '🙂 Good / Responsive',
  5: '😄 Cheerful & Energetic',
};

const MOOD_COLORS = {
  1: '#ef4444',
  2: '#f97316',
  3: '#3b82f6',
  4: '#0d9488',
  5: '#10b981',
};

export default function WeeklySummary({ patientId }) {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = current week, 1 = 1 week ago, 2 = 2 weeks ago

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const d = new Date();
        d.setDate(d.getDate() - (selectedWeekOffset * 7) - 6);
        const weekStart = d.toISOString().split('T')[0];

        const res = await api.get(`/patients/${patientId}/reports/weekly?weekStart=${weekStart}`);
        setSummaryData(res);
      } catch (err) {
        console.error('Failed to load weekly report:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [patientId, selectedWeekOffset]);

  if (loading || !summaryData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
        <p className="text-xs text-slate-500 mt-3 font-medium">Calculating weekly clinical summaries...</p>
      </div>
    );
  }

  const { currentWeek, previousWeek, deltas } = summaryData;

  const renderDelta = (delta, unit = '%', invertColors = false) => {
    if (delta === 0 || isNaN(delta)) {
      return (
        <span className="inline-flex items-center text-[11px] font-semibold text-slate-500">
          <Minus className="w-3 h-3 mr-0.5" /> No change vs last week
        </span>
      );
    }

    const isPositive = delta > 0;
    const isGood = invertColors ? !isPositive : isPositive;

    return (
      <span className={`inline-flex items-center text-[11px] font-bold ${
        isGood ? 'text-emerald-700' : 'text-rose-700'
      }`}>
        {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
        {isPositive ? `+${delta}` : delta}{unit} vs last week
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Week Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <span>Weekly Care Performance & Trends</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Window: <strong>{currentWeek.startDate}</strong> to <strong>{currentWeek.endDate}</strong> compared to preceding 7 days
          </p>
        </div>

        {/* Offset Selector */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setSelectedWeekOffset(0)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              selectedWeekOffset === 0 ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Current Week
          </button>
          <button
            onClick={() => setSelectedWeekOffset(1)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              selectedWeekOffset === 1 ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1 Week Ago
          </button>
          <button
            onClick={() => setSelectedWeekOffset(2)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              selectedWeekOffset === 2 ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2 Weeks Ago
          </button>
        </div>
      </div>

      {/* 4 Core Weekly Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Medication Adherence */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medicine Adherence</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Pill className="w-4 h-4" />
              </div>
            </div>

            <div className="text-2xl font-extrabold text-slate-900">
              {currentWeek.medication.adherenceRate}%
            </div>

            <div className="text-xs text-slate-500 mt-1">
              <strong>{currentWeek.medication.givenDoses}</strong> of {currentWeek.medication.expectedDoses} scheduled doses given
              {currentWeek.medication.missedDoses > 0 && (
                <span className="text-red-600 font-semibold ml-1">({currentWeek.medication.missedDoses} missed)</span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-100">
            {renderDelta(deltas.adherenceRate, '%')}
          </div>
        </div>

        {/* 2. Meals Completed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meals Completed</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Utensils className="w-4 h-4" />
              </div>
            </div>

            <div className="text-2xl font-extrabold text-slate-900">
              {currentWeek.nutrition.mealCompletionRate}%
            </div>

            <div className="text-xs text-slate-500 mt-1">
              <strong>{currentWeek.nutrition.completedMealsCount}</strong> of {currentWeek.nutrition.expectedMeals} meals with portion ≥ 50%
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-100">
            {renderDelta(deltas.mealCompletionRate, '%')}
          </div>
        </div>

        {/* 3. Total Activity Minutes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activity Minutes</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Footprints className="w-4 h-4" />
              </div>
            </div>

            <div className="text-2xl font-extrabold text-slate-900">
              {currentWeek.activity.totalMinutes}{' '}
              <span className="text-xs font-normal text-slate-500">mins</span>
            </div>

            <div className="text-xs text-slate-500 mt-1">
              Avg <strong>{Math.round(currentWeek.activity.totalMinutes / 7)} mins/day</strong> across {currentWeek.activity.sessionsCount} sessions
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-100">
            {renderDelta(deltas.activityMinutes, ' mins')}
          </div>
        </div>

        {/* 4. Mood Score */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Mood</span>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <Smile className="w-4 h-4" />
              </div>
            </div>

            <div className="text-2xl font-extrabold text-slate-900">
              {currentWeek.mood.averageScore}{' '}
              <span className="text-xs font-normal text-slate-400">/ 5.0</span>
            </div>

            <div className="text-xs text-slate-500 mt-1">
              {currentWeek.mood.averageScore >= 4 ? 'Predominantly cheerful & good' :
               currentWeek.mood.averageScore >= 3 ? 'Calm & resting' : 'Periods of fatigue'}
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-100">
            {renderDelta(deltas.moodScore, ' pts')}
          </div>
        </div>
      </div>

      {/* Mood Trend Chart for the 7 Days */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Smile className="w-4 h-4 text-amber-500" />
            <span>7-Day Patient Mood Progression</span>
          </h4>
          <span className="text-xs text-slate-500">Scale: 1 (Distressed) to 5 (Cheerful)</span>
        </div>

        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentWeek.mood.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              <XAxis
                dataKey="dayName"
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              
              <YAxis
                domain={[0, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1">
                        <div className="font-semibold">{data.dayName} ({data.date})</div>
                        <div className="font-bold text-amber-400">
                          {MOOD_EMOJIS[data.mood] || 'Not Recorded'}
                        </div>
                        {data.note && (
                          <div className="text-[11px] text-slate-400 italic">"{data.note}"</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Bar dataKey="mood" radius={[6, 6, 0, 0]}>
                {currentWeek.mood.trend.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={MOOD_COLORS[entry.mood] || '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

