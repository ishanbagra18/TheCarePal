import React, { useState } from 'react';
import { Smile, Frown, Meh, SmilePlus, AlertCircle, FileText, Plus, Trash2 } from 'lucide-react';
import { formatTimeIST } from '../../utils/date';
import api from '../../api/client';

const MOODS = [
  { level: 1, label: 'Distressed / Agitated', icon: Frown, color: 'border-red-400 bg-red-50 text-red-800' },
  { level: 2, label: 'Low / Fatigued', icon: Frown, color: 'border-orange-400 bg-orange-50 text-orange-800' },
  { level: 3, label: 'Calm / Resting', icon: Meh, color: 'border-blue-400 bg-blue-50 text-blue-800' },
  { level: 4, label: 'Good / Responsive', icon: Smile, color: 'border-teal-400 bg-teal-50 text-teal-800' },
  { level: 5, label: 'Cheerful & Energetic', icon: SmilePlus, color: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
];

const CLINICAL_OBS_SNIPPETS = [
  'Slept soundly for 7+ hours without interruption',
  'Skin check completed, no pressure marks observed',
  'Hydration and appetite maintained throughout the day',
  'Interacted actively during the afternoon visit',
  'Family video call boosted emotional well-being',
  'Complained of minor stiffness, relieved by gentle stretching'
];

export default function MoodObsTab({ patientId, selectedDate, moods = [], observations = [], onRefresh, showToast }) {
  // Mood State
  const [selectedMood, setSelectedMood] = useState(4);
  const [moodNote, setMoodNote] = useState('');
  const [submittingMood, setSubmittingMood] = useState(false);

  // Observation State
  const [obsText, setObsText] = useState('');
  const [submittingObs, setSubmittingObs] = useState(false);

  const handleMoodSubmit = async (e) => {
    e.preventDefault();
    const moodConfig = MOODS.find(m => m.level === selectedMood) || MOODS[3];

    setSubmittingMood(true);
    try {
      await api.post(`/patients/${patientId}/mood`, {
        mood: selectedMood,
        label: moodConfig.label,
        note: moodNote.trim() || null,
        logged_at: `${selectedDate}T${new Date().toISOString().split('T')[1]}`,
      });

      showToast({ type: 'success', message: `Mood recorded: ${moodConfig.label}` });
      setMoodNote('');
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to save mood' });
    } finally {
      setSubmittingMood(false);
    }
  };

  const handleObsSubmit = async (e) => {
    e.preventDefault();
    if (!obsText.trim()) {
      showToast({ type: 'error', message: 'Please write a nurse observation note.' });
      return;
    }

    setSubmittingObs(true);
    try {
      await api.post(`/patients/${patientId}/observations`, {
        text: obsText.trim(),
        logged_at: `${selectedDate}T${new Date().toISOString().split('T')[1]}`,
      });

      showToast({ type: 'success', message: 'Nurse clinical observation saved' });
      setObsText('');
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to save observation' });
    } finally {
      setSubmittingObs(false);
    }
  };

  const handleDeleteObs = async (id) => {
    if (!window.confirm('Delete this observation note?')) return;
    try {
      await api.delete(`/patients/${patientId}/observations/${id}`);
      showToast({ type: 'success', message: 'Observation note deleted' });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Patient Mood Assessment Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center space-x-2">
          <Smile className="w-5 h-5 text-amber-500" />
          <span>Patient Emotional Mood Assessment</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Record emotional state, responsiveness, and demeanor for {selectedDate}
        </p>

        <form onSubmit={handleMoodSubmit} className="space-y-4">
          {/* Mood 1-5 selector */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {MOODS.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMood === m.level;
              return (
                <button
                  key={m.level}
                  type="button"
                  onClick={() => setSelectedMood(m.level)}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                    isSelected
                      ? `${m.color} ring-2 ring-teal-500/30 font-bold shadow-sm`
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-1.5" />
                  <span className="text-xs font-bold">{m.level} • {m.label.split('/')[0].trim()}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Caregiver Behavioral Observations (Optional)
            </label>
            <input
              type="text"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="e.g. Patient was cheerful and talkative, enjoyed family call"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={submittingMood}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition shadow-sm"
          >
            {submittingMood ? 'Recording...' : 'Record Patient Mood'}
          </button>
        </form>

        {moods.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Recorded Today:
            </h5>
            <div className="space-y-2">
              {moods.map((m) => (
                <div key={m.id} className="text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{m.label} (Level {m.mood}/5)</span>
                    {m.note && <span className="text-slate-600 italic ml-2">"{m.note}"</span>}
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{formatTimeIST(m.logged_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Nurse Clinical Observations Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-teal-600" />
          <span>Nurse Clinical Notes & Observations</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Detailed observations visible transparently to the family on their daily timeline
        </p>

        <form onSubmit={handleObsSubmit} className="space-y-3">
          {/* Quick Snippet Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Quick Observation Snippets:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CLINICAL_OBS_SNIPPETS.map((snippet, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setObsText((prev) => (prev ? `${prev}. ${snippet}` : snippet))}
                  className="text-[11px] bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition text-left"
                >
                  + {snippet}
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              rows="3"
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Enter comprehensive clinical nurse observation (sleep quality, appetite, mobility, emotional state, family interactions)..."
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={submittingObs}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition shadow-sm"
          >
            {submittingObs ? 'Saving...' : 'Save Observation Note'}
          </button>
        </form>

        {/* Saved Observations List */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>Clinical Notes for {selectedDate}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {observations.length} {observations.length === 1 ? 'note' : 'notes'}
            </span>
          </h4>

          {observations.length === 0 ? (
            <div className="text-center py-5 text-sm text-slate-500">
              No observation notes recorded for this date yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {observations.map((obs) => (
                <div key={obs.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between group">
                  <div>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{obs.text}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Logged at {formatTimeIST(obs.logged_at)}
                      {obs.nurse_name && ` • By ${obs.nurse_name}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteObs(obs.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-2 flex-shrink-0"
                    title="Delete note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

