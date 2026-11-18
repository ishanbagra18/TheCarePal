import React, { useState } from 'react';
import { Footprints, Dumbbell, Stethoscope, Compass, MoreHorizontal, Trash2, Edit2, Clock } from 'lucide-react';
import { formatTimeIST } from '../../utils/date';
import api from '../../api/client';

const ACTIVITY_TYPES = [
  { type: 'walk', label: 'Walk', icon: Footprints, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { type: 'physio', label: 'Physiotherapy', icon: Stethoscope, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { type: 'exercise', label: 'Exercise / Yoga', icon: Dumbbell, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { type: 'outing', label: 'Outing / Fresh Air', icon: Compass, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { type: 'other', label: 'Other', icon: MoreHorizontal, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export default function ActivitiesTab({ patientId, selectedDate, activities = { totalMinutes: 0, entries: [] }, onRefresh, showToast }) {
  const [selectedType, setSelectedType] = useState('walk');
  const [minutes, setMinutes] = useState('20');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const duration = Number(minutes);
    if (isNaN(duration) || duration <= 0) {
      showToast({ type: 'error', message: 'Please enter valid minutes.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: selectedType,
        minutes: duration,
        note: note.trim() || null,
        logged_at: editingId ? undefined : `${selectedDate}T${new Date().toISOString().split('T')[1]}`,
      };

      if (editingId) {
        await api.put(`/patients/${patientId}/activities/${editingId}`, payload);
        showToast({ type: 'success', message: 'Activity entry updated' });
        setEditingId(null);
      } else {
        await api.post(`/patients/${patientId}/activities`, payload);
        showToast({ type: 'success', message: `${selectedType.toUpperCase()} (${duration} mins) logged!` });
      }

      setNote('');
      setMinutes('20');
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to save activity' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this activity entry?')) return;
    try {
      await api.delete(`/patients/${patientId}/activities/${id}`);
      showToast({ type: 'success', message: 'Activity deleted' });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete' });
    }
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setSelectedType(a.type);
    setMinutes(String(a.minutes));
    setNote(a.note || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNote('');
    setMinutes('20');
  };

  return (
    <div className="space-y-6">
      {/* Activity Entry Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span>{editingId ? 'Edit Activity Entry' : 'Log Physical Activity & Exercise'}</span>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Cancel Edit
            </button>
          )}
        </h3>

        {/* Activity Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {ACTIVITY_TYPES.map((act) => {
            const Icon = act.icon;
            const isSelected = selectedType === act.type;
            return (
              <button
                key={act.type}
                type="button"
                onClick={() => setSelectedType(act.type)}
                className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Quick Duration Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Duration in Minutes
            </label>
            <div className="flex items-center space-x-2">
              {[15, 20, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(String(m))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    minutes === String(m)
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m}m
                </button>
              ))}
              <input
                type="number"
                min="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Custom mins"
                className="w-28 px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Activity Notes (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Quadriceps exercise with elastic band, patient tolerated well"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition shadow-sm"
          >
            {submitting ? 'Saving...' : editingId ? 'Update Activity' : `Record ${selectedType}`}
          </button>
        </form>
      </div>

      {/* Logged Activities List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-900">
            Activities Logged for {selectedDate}
          </h4>
          <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            {activities.totalMinutes} mins total
          </span>
        </div>

        {activities.entries.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            No physical activity logged for this date yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.entries.map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                      {a.type}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {a.minutes} Minutes
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Logged at {formatTimeIST(a.logged_at)}
                    {a.nurse_name && ` • By ${a.nurse_name}`}
                  </div>
                  {a.note && (
                    <div className="text-xs text-slate-600 italic mt-0.5">
                      "{a.note}"
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => startEdit(a)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                    title="Edit activity"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete activity"
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

