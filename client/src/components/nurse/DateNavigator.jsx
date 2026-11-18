import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getTodayIST, formatRelativeDate } from '../../utils/date';

export default function DateNavigator({ selectedDate, onDateChange }) {
  const today = getTodayIST();

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const nextDate = d.toISOString().split('T')[0];
    if (nextDate <= today) {
      onDateChange(nextDate);
    }
  };

  const isToday = selectedDate === today;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
      <button
        onClick={handlePrevDay}
        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-95 transition"
        title="Previous Day"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center space-x-2">
        <label htmlFor="nurse-date-input" className="cursor-pointer flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl transition">
          <CalendarIcon className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-bold text-slate-900">{formatRelativeDate(selectedDate)}</span>
          <input
            id="nurse-date-input"
            type="date"
            max={today}
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="opacity-0 w-0 h-0 absolute pointer-events-none"
          />
        </label>
        {!isToday && (
          <button
            onClick={() => onDateChange(today)}
            className="text-xs font-semibold px-2.5 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition"
          >
            Jump to Today
          </button>
        )}
      </div>

      <button
        onClick={handleNextDay}
        disabled={isToday}
        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700 active:scale-95 transition"
        title="Next Day"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

