import React, { useState } from 'react';
import { Activity, Heart, Thermometer, Droplet, Gauge, Scale, AlertTriangle, CheckCircle, Trash2, Edit2 } from 'lucide-react';
import { checkVitalRange, NORMAL_RANGES } from '../../config/normalRanges';
import { formatTimeIST } from '../../utils/date';
import api from '../../api/client';

const VITAL_CONFIGS = [
  { type: 'bp', label: 'Blood Pressure', unit: 'mmHg', icon: Gauge, hasSecond: true, secondLabel: 'Diastolic', defaultUnit: 'mmHg' },
  { type: 'pulse', label: 'Pulse Rate', unit: 'bpm', icon: Heart, defaultUnit: 'bpm' },
  { type: 'spo2', label: 'Blood Oxygen (SpO2)', unit: '%', icon: Activity, defaultUnit: '%' },
  { type: 'sugar', label: 'Blood Sugar (Fasting)', unit: 'mg/dL', icon: Droplet, defaultUnit: 'mg/dL' },
  { type: 'temp', label: 'Temperature', unit: '°C', icon: Thermometer, defaultUnit: '°C' },
  { type: 'weight', label: 'Weight', unit: 'kg', icon: Scale, defaultUnit: 'kg' },
];

export default function VitalsTab({ patientId, selectedDate, vitals = [], onRefresh, showToast }) {
  const [selectedType, setSelectedType] = useState('bp');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const activeConfig = VITAL_CONFIGS.find(v => v.type === selectedType) || VITAL_CONFIGS[0];
  const rangeCheck = checkVitalRange(selectedType, value, value2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || isNaN(Number(value))) {
      showToast({ type: 'error', message: 'Please enter a valid numeric value.' });
      return;
    }

    if (activeConfig.hasSecond && (!value2 || isNaN(Number(value2)))) {
      showToast({ type: 'error', message: 'Please enter diastolic blood pressure.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: selectedType,
        value: Number(value),
        value2: activeConfig.hasSecond && value2 ? Number(value2) : null,
        unit: activeConfig.unit,
        notes: notes.trim() || null,
        recorded_at: editingId ? undefined : `${selectedDate}T${new Date().toISOString().split('T')[1]}`,
      };

      if (editingId) {
        await api.put(`/patients/${patientId}/vitals/${editingId}`, payload);
        showToast({ type: 'success', message: 'Vital reading updated successfully!' });
        setEditingId(null);
      } else {
        await api.post(`/patients/${patientId}/vitals`, payload);
        showToast({
          type: 'success',
          title: rangeCheck.isOutOfRange ? 'Warning: Out of Range' : 'Vital Logged',
          message: rangeCheck.isOutOfRange 
            ? `Logged with alert: ${rangeCheck.reason}` 
            : `${activeConfig.label} logged successfully!`
        });
      }

      setValue('');
      setValue2('');
      setNotes('');
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to save vital entry' });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (vital) => {
    setEditingId(vital.id);
    setSelectedType(vital.type);
    setValue(String(vital.value));
    setValue2(vital.value2 ? String(vital.value2) : '');
    setNotes(vital.notes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setValue('');
    setValue2('');
    setNotes('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vital reading?')) return;
    try {
      await api.delete(`/patients/${patientId}/vitals/${id}`);
      showToast({ type: 'success', message: 'Vital entry deleted' });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Vitals Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span>{editingId ? 'Edit Vital Reading' : 'Log New Vital Reading'}</span>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Cancel Edit
            </button>
          )}
        </h3>

        {/* Vital Type Selector Chips */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {VITAL_CONFIGS.map((cfg) => {
            const Icon = cfg.icon;
            const isSelected = selectedType === cfg.type;
            return (
              <button
                key={cfg.type}
                type="button"
                onClick={() => {
                  setSelectedType(cfg.type);
                  setValue('');
                  setValue2('');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="truncate w-full text-center">{cfg.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Entry Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {activeConfig.hasSecond ? 'Systolic (mmHg)' : `${activeConfig.label} (${activeConfig.unit})`}
              </label>
              <input
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={activeConfig.type === 'bp' ? '120' : activeConfig.type === 'spo2' ? '98' : activeConfig.type === 'sugar' ? '110' : '36.8'}
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {activeConfig.hasSecond && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diastolic (mmHg)
                </label>
                <input
                  type="number"
                  step="any"
                  value={value2}
                  onChange={(e) => setValue2(e.target.value)}
                  placeholder="80"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          {/* Real-time Range Status Indicator */}
          {value && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 border ${
              rangeCheck.isOutOfRange
                ? 'bg-red-50 border-red-200 text-red-800 font-medium'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {rangeCheck.isOutOfRange ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>Out of normal range: <strong>{rangeCheck.reason}</strong></span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Normal clinical reading ({activeConfig.label})</span>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Caregiver Clinical Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Measured at rest, patient had mild morning dizziness"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition shadow-sm"
          >
            {submitting ? 'Saving...' : editingId ? 'Update Vital Entry' : `Record ${activeConfig.label}`}
          </button>
        </form>
      </div>

      {/* Logged Vitals for Selected Day */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span>Vitals Logged for {selectedDate}</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {vitals.length} {vitals.length === 1 ? 'entry' : 'entries'}
          </span>
        </h4>

        {vitals.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            No vitals recorded on this date yet. Use the form above to log a reading.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {vitals.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-900">
                      {v.type === 'bp' ? `${v.value}/${v.value2} mmHg` : `${v.value} ${v.unit}`}
                    </span>
                    <span className="text-xs text-slate-500 uppercase font-semibold">
                      ({v.type})
                    </span>
                    {v.is_out_of_range === 1 ? (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        Out of Range
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Normal
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Logged at {formatTimeIST(v.recorded_at)}
                    {v.nurse_name && ` • By ${v.nurse_name}`}
                  </div>
                  {v.notes && (
                    <div className="text-xs text-slate-600 italic mt-0.5">
                      "{v.notes}"
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => startEdit(v)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                    title="Edit entry"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

