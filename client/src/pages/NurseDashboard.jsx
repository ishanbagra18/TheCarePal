import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import DateNavigator from '../components/nurse/DateNavigator';
import VitalsTab from '../components/nurse/VitalsTab';
import MealsTab from '../components/nurse/MealsTab';
import MedicinesTab from '../components/nurse/MedicinesTab';
import ActivitiesTab from '../components/nurse/ActivitiesTab';
import MoodObsTab from '../components/nurse/MoodObsTab';
import PhotosTab from '../components/nurse/PhotosTab';
import Toast from '../components/common/Toast';
import { getTodayIST } from '../utils/date';
import api from '../api/client';
import {
  Activity,
  Utensils,
  Pill,
  Footprints,
  Smile,
  AlertTriangle,
  User,
  MapPin,
  Clock,
  RefreshCw,
  Camera
} from 'lucide-react';

const TABS = [
  { id: 'vitals', label: 'Vitals', icon: Activity, badgeKey: 'vitals' },
  { id: 'meals', label: 'Meals & Water', icon: Utensils, badgeKey: 'meals' },
  { id: 'medicines', label: 'Medicines', icon: Pill, badgeKey: 'medicines' },
  { id: 'activities', label: 'Activities', icon: Footprints, badgeKey: 'activities' },
  { id: 'mood', label: 'Mood & Obs', icon: Smile, badgeKey: 'observations' },
  { id: 'photos', label: 'Photos', icon: Camera, badgeKey: 'photos' },
];

export default function NurseDashboard() {
  const { user, activePatient } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [activeTab, setActiveTab] = useState('vitals');
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchDailyLog = useCallback(async (isSilent = false) => {
    if (!activePatient) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await api.get(`/patients/${activePatient.id}/daily?date=${selectedDate}`);
      setDailyData(data);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to load daily care records' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activePatient, selectedDate]);

  useEffect(() => {
    fetchDailyLog();
  }, [fetchDailyLog]);

  if (!activePatient) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-md mx-auto">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">No Patient Assigned</h2>
          <p className="text-sm text-slate-500 mt-1">
            You do not currently have any active care assignments.
          </p>
        </div>
      </div>
    );
  }

  // Count summary metrics
  const abnormalVitalsCount = dailyData?.vitals?.filter(v => v.is_out_of_range === 1)?.length || 0;
  const missedMedsCount = dailyData?.medicines?.filter(m => m.doseRecord?.status === 'missed')?.length || 0;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {activePatient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">{activePatient.name}</h1>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                  Age {activePatient.age}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-y-1 gap-x-3 mt-1">
                <span className="font-medium text-slate-700">{activePatient.condition}</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {activePatient.city}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Status Badges */}
          <div className="flex items-center space-x-2 self-start sm:self-center">
            {abnormalVitalsCount > 0 && (
              <span className="text-xs bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                {abnormalVitalsCount} Out of Range
              </span>
            )}
            {missedMedsCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
                {missedMedsCount} Missed Dose
              </span>
            )}
            <button
              onClick={() => fetchDailyLog(true)}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl border border-slate-200 transition"
              title="Refresh log"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Date Navigator */}
      <DateNavigator
        selectedDate={selectedDate}
        onDateChange={(newDate) => setSelectedDate(newDate)}
      />

      {/* Mobile-Friendly Stepper / Tabs Bar */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          let count = 0;
          if (dailyData) {
            if (tab.id === 'vitals') count = dailyData.vitals?.length || 0;
            else if (tab.id === 'meals') count = dailyData.meals?.length || 0;
            else if (tab.id === 'medicines') count = dailyData.medicines?.filter(m => m.doseRecord)?.length || 0;
            else if (tab.id === 'activities') count = dailyData.activities?.entries?.length || 0;
            else if (tab.id === 'mood') count = (dailyData.moods?.length || 0) + (dailyData.observations?.length || 0);
            else if (tab.id === 'photos') count = dailyData.photos?.length || 0;
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition border flex-shrink-0 ${
                isActive
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-xs text-slate-500 mt-3 font-medium">Loading care entries...</p>
        </div>
      ) : (
        <div>
          {activeTab === 'vitals' && (
            <VitalsTab
              patientId={activePatient.id}
              selectedDate={selectedDate}
              vitals={dailyData?.vitals || []}
              onRefresh={() => fetchDailyLog(true)}
              showToast={setToast}
            />
          )}

          {activeTab === 'meals' && (
            <MealsTab
              patientId={activePatient.id}
              selectedDate={selectedDate}
              meals={dailyData?.meals || []}
              water={dailyData?.water || { totalMl: 0, entries: [] }}
              onRefresh={() => fetchDailyLog(true)}
              showToast={setToast}
            />
          )}

          {activeTab === 'medicines' && (
            <MedicinesTab
              patientId={activePatient.id}
              selectedDate={selectedDate}
              medicines={dailyData?.medicines || []}
              onRefresh={() => fetchDailyLog(true)}
              showToast={setToast}
            />
          )}

          {activeTab === 'activities' && (
            <ActivitiesTab
              patientId={activePatient.id}
              selectedDate={selectedDate}
              activities={dailyData?.activities || { totalMinutes: 0, entries: [] }}
              onRefresh={() => fetchDailyLog(true)}
              showToast={setToast}
            />
          )}

          {activeTab === 'mood' && (
            <MoodObsTab
              patientId={activePatient.id}
              selectedDate={selectedDate}
              moods={dailyData?.moods || []}
              observations={dailyData?.observations || []}
              onRefresh={() => fetchDailyLog(true)}
              showToast={setToast}
            />
          )}

          {activeTab === 'photos' && (
            <PhotosTab
              patientId={activePatient.id}
              selectedDate={selectedDate}
              photos={dailyData?.photos || []}
              onRefresh={() => fetchDailyLog(true)}
              showToast={setToast}
            />
          )}
        </div>
      )}
    </div>
  );
}
