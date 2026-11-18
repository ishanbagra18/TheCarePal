import React, { useState } from 'react';
import { Pill, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../../api/client';

export default function MedicinesTab({ patientId, selectedDate, medicines = [], onRefresh, showToast }) {
  const [loadingScheduleId, setLoadingScheduleId] = useState(null);
  const [selectedNotes, setSelectedNotes] = useState({});

  const handleStatusChange = async (schedule, status) => {
    setLoadingScheduleId(schedule.id);
    const note = selectedNotes[schedule.id] || '';

    try {
      await api.post(`/patients/${patientId}/medicines/doses`, {
        schedule_id: schedule.id,
        date: selectedDate,
        status,
        time_given: status === 'given' ? schedule.scheduled_time : null,
        note: note.trim() || (status === 'missed' ? 'Marked missed by nurse' : 'Administered on schedule'),
      });

      showToast({
        type: status === 'given' ? 'success' : 'error',
        title: status === 'given' ? 'Dose Marked Given' : 'Dose Marked Missed',
        message: status === 'given' 
          ? `${schedule.name} marked as administered.`
          : `Missed alert triggered for ${schedule.name}.`
      });

      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to update medicine status' });
    } finally {
      setLoadingScheduleId(null);
    }
  };

  const givenCount = medicines.filter(m => m.doseRecord?.status === 'given').length;
  const missedCount = medicines.filter(m => m.doseRecord?.status === 'missed').length;
  const pendingCount = medicines.length - (givenCount + missedCount);

  return (
    <div className="space-y-6">
      {/* Adherence Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Pill className="w-5 h-5 text-indigo-600" />
            <span>Scheduled Daily Medications</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Mark each scheduled medicine as Given or Missed for {selectedDate}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {givenCount} Given
          </span>
          <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> {missedCount} Missed
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
            {pendingCount} Pending
          </span>
        </div>
      </div>

      {/* Medicines List */}
      <div className="space-y-3">
        {medicines.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            No scheduled medications configured for this patient.
          </div>
        ) : (
          medicines.map((sched) => {
            const dose = sched.doseRecord;
            const isGiven = dose?.status === 'given';
            const isMissed = dose?.status === 'missed';
            const isLoading = loadingScheduleId === sched.id;

            return (
              <div
                key={sched.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${
                  isGiven ? 'border-emerald-200 bg-emerald-50/20' :
                  isMissed ? 'border-red-200 bg-red-50/20' :
                  'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl mt-0.5 ${
                      isGiven ? 'bg-emerald-100 text-emerald-700' :
                      isMissed ? 'bg-red-100 text-red-700' :
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      <Pill className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-900">{sched.name}</h4>
                        <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                          {sched.dose}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" /> {sched.scheduled_time}
                        </span>
                      </div>

                      {sched.instructions && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Instructions: <span className="font-medium text-slate-700">{sched.instructions}</span>
                        </p>
                      )}

                      {dose?.note && (
                        <p className="text-xs text-slate-600 italic mt-1 bg-white/70 px-2 py-0.5 rounded border border-slate-200 inline-block">
                          Note: {dose.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Given / Missed Toggle */}
                  <div className="flex items-center space-x-2 sm:self-center">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleStatusChange(sched, 'given')}
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 border ${
                        isGiven
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isGiven ? 'Given' : 'Mark Given'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleStatusChange(sched, 'missed')}
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 border ${
                        isMissed
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{isMissed ? 'Missed' : 'Mark Missed'}</span>
                    </button>
                  </div>
                </div>

                {/* Optional note input field if nurse needs to specify reason */}
                {!isGiven && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Add nurse note (e.g. refused due to nausea, delayed with food)..."
                      value={selectedNotes[sched.id] || ''}
                      onChange={(e) => setSelectedNotes({ ...selectedNotes, [sched.id]: e.target.value })}
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

