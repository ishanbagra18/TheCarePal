import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import CalendarView from '../components/family/CalendarView';
import DayOverviewCards from '../components/family/DayOverviewCards';
import CareTimeline from '../components/family/CareTimeline';
import VitalsCharts from '../components/analytics/VitalsCharts';
import WeeklySummary from '../components/analytics/WeeklySummary';
import { getTodayIST } from '../utils/date';
import api from '../api/client';
import {
  HeartHandshake,
  MapPin,
  User,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Clock,
  Activity,
  BarChart2,
  FileDown
} from 'lucide-react';

export default function FamilyDashboard() {
  const { user, activePatient } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [activeView, setActiveView] = useState('timeline'); // 'timeline', 'charts', 'weekly'
  const [dailyData, setDailyData] = useState(null);
  const [calendarDots, setCalendarDots] = useState({ datesWithLogs: [], datesWithAlerts: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState('');

  const handleDownloadPdf = async () => {
    if (!activePatient) return;
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem('carepal_token');
      const response = await fetch(`/api/patients/${activePatient.id}/reports/pdf?days=30`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to generate PDF report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TheCarePal_Report_${activePatient.name.replace(/\s+/g, '_')}_30Days.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Could not download report: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!activePatient) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      // Fetch daily log and calendar dots concurrently
      const [dailyRes, dotsRes] = await Promise.all([
        api.get(`/patients/${activePatient.id}/daily?date=${selectedDate}`),
        api.get(`/patients/${activePatient.id}/calendar-dots`),
      ]);

      setDailyData(dailyRes);
      setCalendarDots(dotsRes);
    } catch (err) {
      setError(err.message || 'Failed to load patient daily records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activePatient, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!activePatient) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-md mx-auto">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">No Patient Linked</h2>
          <p className="text-sm text-slate-500 mt-1">
            You do not currently have any family patient records linked to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Patient & Caregiver Summary Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {activePatient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">{activePatient.name}</h1>
                <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
                  Age {activePatient.age}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-y-1 gap-x-3 mt-1">
                <span className="font-semibold text-slate-700">{activePatient.condition}</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {activePatient.city}
                </span>
                {activePatient.relationship && (
                  <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-medium">
                    Relationship: {activePatient.relationship}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition"
              title="Download 30-Day PDF Medical Report for Consulting Physician"
            >
              <FileDown className="w-4 h-4" />
              <span>{downloadingPdf ? 'Generating PDF...' : 'Download Doctor Report (PDF)'}</span>
            </button>

            <span className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium hidden md:flex">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Read-Only</span>
            </span>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl border border-slate-200 transition"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main View Mode Selector (Tabs) */}
      <div className="flex space-x-2 bg-slate-200/70 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveView('timeline')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeView === 'timeline'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-teal-600" />
          <span>Daily Care Timeline</span>
        </button>

        <button
          onClick={() => setActiveView('charts')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeView === 'charts'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-teal-600" />
          <span>Vitals Trends & Charts</span>
        </button>

        <button
          onClick={() => setActiveView('weekly')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeView === 'weekly'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-teal-600" />
          <span>Weekly Summary Report</span>
        </button>
      </div>

      {/* View 1: Daily Timeline */}
      {activeView === 'timeline' && (
        <div className="space-y-4">
          <CalendarView
            selectedDate={selectedDate}
            onDateChange={(date) => setSelectedDate(date)}
            datesWithLogs={calendarDots.datesWithLogs}
            datesWithAlerts={calendarDots.datesWithAlerts}
          />

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="text-xs text-slate-500 mt-3 font-medium">Loading daily care history...</p>
            </div>
          ) : (
            <>
              <DayOverviewCards dailyData={dailyData} />
              <CareTimeline
                timeline={dailyData?.timeline || []}
                selectedDate={selectedDate}
              />
            </>
          )}
        </div>
      )}

      {/* View 2: Vitals Charts */}
      {activeView === 'charts' && (
        <VitalsCharts patientId={activePatient.id} />
      )}

      {/* View 3: Weekly Summary */}
      {activeView === 'weekly' && (
        <WeeklySummary patientId={activePatient.id} />
      )}
    </div>
  );
}
