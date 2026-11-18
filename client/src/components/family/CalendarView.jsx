import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { getTodayIST, formatRelativeDate, formatDateIST } from '../../utils/date';

export default function CalendarView({ selectedDate, onDateChange, datesWithLogs = [], datesWithAlerts = [] }) {
  const today = getTodayIST();
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [showFullMonth, setShowFullMonth] = useState(false);

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

  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generate month days
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      {/* Top Bar: Prev Day / Date Display / Next Day / Month Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevDay}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-95 transition"
          title="Previous Day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFullMonth(!showFullMonth)}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 transition font-bold text-sm"
          >
            <CalendarIcon className="w-4 h-4 text-teal-600" />
            <span>{formatRelativeDate(selectedDate)}</span>
            {showFullMonth ? <ChevronUp className="w-4 h-4 text-teal-600 ml-1" /> : <ChevronDown className="w-4 h-4 text-teal-600 ml-1" />}
          </button>

          {selectedDate !== today && (
            <button
              onClick={() => onDateChange(today)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition hidden sm:inline-block"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={handleNextDay}
          disabled={selectedDate >= today}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700 active:scale-95 transition"
          title="Next Day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Expandable Full Month Calendar Grid with Care Dots */}
      {showFullMonth && (
        <div className="pt-3 border-t border-slate-100 animate-fade-in">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-sm font-bold text-slate-800">{monthName}</h4>
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank cells for start offset */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9"></div>
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isFuture = dateStr > today;
              const hasLogs = datesWithLogs.includes(dateStr);
              const hasAlert = datesWithAlerts.includes(dateStr);

              return (
                <button
                  key={dateStr}
                  disabled={isFuture}
                  onClick={() => {
                    onDateChange(dateStr);
                    setShowFullMonth(false);
                  }}
                  className={`h-9 flex flex-col items-center justify-center rounded-xl text-xs font-semibold relative transition ${
                    isSelected
                      ? 'bg-teal-600 text-white font-bold shadow-sm'
                      : isFuture
                      ? 'text-slate-300 pointer-events-none'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{dayNum}</span>
                  {/* Indicator Dots */}
                  <div className="flex items-center space-x-0.5 mt-0.5">
                    {hasAlert && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-red-500'}`} title="Has out-of-range reading or missed dose"></span>
                    )}
                    {hasLogs && !hasAlert && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-teal-500'}`} title="Has care logs"></span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              <span>Care logged</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Alert / Out of range</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

