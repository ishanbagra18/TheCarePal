import React, { useState } from 'react';
import { Utensils, GlassWater, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { formatTimeIST } from '../../utils/date';
import api from '../../api/client';

const MEAL_PRESETS = [
  'Poha with peanuts & green chutney',
  'Idli with hot sambar & coconut chutney',
  '2 Phulkas, dal tadka & bhindi sabzi',
  'Steamed rice with rajma & cucumber salad',
  'Moong dal khichdi with ghee & curd',
  'Fresh papaya & pomegranate fruit bowl',
  'Vegetable soup with digestive biscuits',
  '2 Rotis with lauki sabzi & chaas',
];

const PORTIONS = [
  { value: 'none', label: 'None (0%)', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'quarter', label: 'Quarter (25%)', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'half', label: 'Half (50%)', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'most', label: 'Most (75%)', color: 'bg-lime-50 text-lime-700 border-lime-200' },
  { value: 'full', label: 'Full (100%)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export default function MealsTab({ patientId, selectedDate, meals = [], water = { totalMl: 0, entries: [] }, onRefresh, showToast }) {
  const [mealType, setMealType] = useState('breakfast');
  const [description, setDescription] = useState('');
  const [portion, setPortion] = useState('full');
  const [notes, setNotes] = useState('');
  const [submittingMeal, setSubmittingMeal] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);

  // Water quick log
  const [customWaterMl, setCustomWaterMl] = useState('');
  const [submittingWater, setSubmittingWater] = useState(false);

  const handleMealSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast({ type: 'error', message: 'Please describe what was eaten.' });
      return;
    }

    setSubmittingMeal(true);
    try {
      const payload = {
        type: mealType,
        description: description.trim(),
        portion,
        notes: notes.trim() || null,
        logged_at: editingMealId ? undefined : `${selectedDate}T${new Date().toISOString().split('T')[1]}`,
      };

      if (editingMealId) {
        await api.put(`/patients/${patientId}/meals/${editingMealId}`, payload);
        showToast({ type: 'success', message: 'Meal entry updated!' });
        setEditingMealId(null);
      } else {
        await api.post(`/patients/${patientId}/meals`, payload);
        showToast({ type: 'success', message: `${mealType.toUpperCase()} logged successfully!` });
      }

      setDescription('');
      setNotes('');
      setPortion('full');
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to save meal' });
    } finally {
      setSubmittingMeal(false);
    }
  };

  const handleLogWater = async (ml) => {
    const amount = Number(ml);
    if (isNaN(amount) || amount <= 0) {
      showToast({ type: 'error', message: 'Enter a valid ml amount.' });
      return;
    }

    setSubmittingWater(true);
    try {
      await api.post(`/patients/${patientId}/water`, {
        ml: amount,
        logged_at: `${selectedDate}T${new Date().toISOString().split('T')[1]}`,
      });
      showToast({ type: 'success', message: `+${amount} ml water intake recorded` });
      setCustomWaterMl('');
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to log water' });
    } finally {
      setSubmittingWater(false);
    }
  };

  const handleDeleteMeal = async (id) => {
    if (!window.confirm('Delete this meal entry?')) return;
    try {
      await api.delete(`/patients/${patientId}/meals/${id}`);
      showToast({ type: 'success', message: 'Meal entry deleted' });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete' });
    }
  };

  const handleDeleteWater = async (id) => {
    try {
      await api.delete(`/patients/${patientId}/water/${id}`);
      showToast({ type: 'success', message: 'Water entry removed' });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete' });
    }
  };

  const startEditMeal = (m) => {
    setEditingMealId(m.id);
    setMealType(m.type);
    setDescription(m.description);
    setPortion(m.portion);
    setNotes(m.notes || '');
  };

  const cancelEditMeal = () => {
    setEditingMealId(null);
    setDescription('');
    setNotes('');
    setPortion('full');
  };

  return (
    <div className="space-y-6">
      {/* 1. Water Intake Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <GlassWater className="w-5 h-5 text-sky-500" />
            <span>Water Hydration Log</span>
          </h3>
          <span className="text-sm font-bold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
            {water.totalMl} ml total today
          </span>
        </div>

        {/* Hydration progress bar (target: 2000 ml) */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
          <div
            className="bg-sky-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (water.totalMl / 2000) * 100)}%` }}
          ></div>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={submittingWater}
            onClick={() => handleLogWater(250)}
            className="px-3.5 py-1.5 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 text-xs font-semibold hover:bg-sky-100 transition active:scale-95"
          >
            + Glass (250 ml)
          </button>
          <button
            type="button"
            disabled={submittingWater}
            onClick={() => handleLogWater(500)}
            className="px-3.5 py-1.5 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 text-xs font-semibold hover:bg-sky-100 transition active:scale-95"
          >
            + Bottle (500 ml)
          </button>

          <div className="flex items-center space-x-1.5 ml-auto">
            <input
              type="number"
              placeholder="Custom ml"
              value={customWaterMl}
              onChange={(e) => setCustomWaterMl(e.target.value)}
              className="w-24 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <button
              type="button"
              disabled={submittingWater || !customWaterMl}
              onClick={() => handleLogWater(customWaterMl)}
              className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-40 transition"
            >
              Add
            </button>
          </div>
        </div>

        {water.entries && water.entries.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            {water.entries.map((w) => (
              <span
                key={w.id}
                className="inline-flex items-center space-x-1 bg-slate-50 border border-slate-200 text-slate-700 text-[11px] px-2 py-1 rounded-lg"
              >
                <span>{w.ml} ml at {formatTimeIST(w.logged_at)}</span>
                <button
                  onClick={() => handleDeleteWater(w.id)}
                  className="text-slate-400 hover:text-red-500 ml-1"
                  title="Remove entry"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Meal Log Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Utensils className="w-5 h-5 text-teal-600" />
            <span>{editingMealId ? 'Edit Meal' : 'Log Daily Meal'}</span>
          </span>
          {editingMealId && (
            <button
              onClick={cancelEditMeal}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Cancel Edit
            </button>
          )}
        </h3>

        {/* Meal Type Radio Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {['breakfast', 'lunch', 'snack', 'dinner'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={`py-2 px-1 text-center rounded-xl text-xs font-bold uppercase tracking-wider transition border ${
                mealType === type
                  ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <form onSubmit={handleMealSubmit} className="space-y-3">
          {/* Quick Preset Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Quick Select Common Indian Meals:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MEAL_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDescription(preset)}
                  className="text-[11px] bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition text-left"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Food & Beverage Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 2 Phulkas, yellow moong dal tadka & cucumber salad"
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Portion Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Portion Consumed by Patient
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {PORTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPortion(p.value)}
                  className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition ${
                    portion === p.value
                      ? `${p.color} ring-2 ring-teal-500/30 font-extrabold`
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Appetite & Intake Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Enjoyed the warm meal; drank warm water alongside"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={submittingMeal}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition shadow-sm"
          >
            {submittingMeal ? 'Saving...' : editingMealId ? 'Update Meal' : `Record ${mealType}`}
          </button>
        </form>
      </div>

      {/* Logged Meals List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span>Meals Logged for {selectedDate}</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
          </span>
        </h4>

        {meals.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            No meals recorded for this date yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {meals.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between group">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                      {m.type}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {m.description}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      m.portion === 'none' ? 'bg-red-50 text-red-700 border-red-200' :
                      m.portion === 'quarter' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      m.portion === 'half' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {m.portion} portion
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Logged at {formatTimeIST(m.logged_at)}
                    {m.nurse_name && ` • By ${m.nurse_name}`}
                  </div>
                  {m.notes && (
                    <div className="text-xs text-slate-600 italic mt-0.5">
                      "{m.notes}"
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => startEditMeal(m)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                    title="Edit meal"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMeal(m.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete meal"
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

