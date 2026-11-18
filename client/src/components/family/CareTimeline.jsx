import React, { useState } from 'react';
import {
  Activity,
  Utensils,
  GlassWater,
  Pill,
  Footprints,
  Smile,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Camera
} from 'lucide-react';
import { formatTimeIST } from '../../utils/date';

const CATEGORY_META = {
  vital: {
    label: 'Vitals',
    icon: Activity,
    dotColor: 'bg-rose-500 text-white',
    borderColor: 'border-rose-200',
    bgColor: 'bg-rose-50/30'
  },
  meal: {
    label: 'Meal',
    icon: Utensils,
    dotColor: 'bg-amber-500 text-white',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50/30'
  },
  water: {
    label: 'Water',
    icon: GlassWater,
    dotColor: 'bg-sky-500 text-white',
    borderColor: 'border-sky-200',
    bgColor: 'bg-sky-50/30'
  },
  medicine: {
    label: 'Medicine',
    icon: Pill,
    dotColor: 'bg-indigo-500 text-white',
    borderColor: 'border-indigo-200',
    bgColor: 'bg-indigo-50/30'
  },
  activity: {
    label: 'Activity',
    icon: Footprints,
    dotColor: 'bg-emerald-500 text-white',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50/30'
  },
  mood: {
    label: 'Mood',
    icon: Smile,
    dotColor: 'bg-yellow-500 text-white',
    borderColor: 'border-yellow-200',
    bgColor: 'bg-yellow-50/30'
  },
  observation: {
    label: 'Nurse Note',
    icon: FileText,
    dotColor: 'bg-teal-600 text-white',
    borderColor: 'border-teal-200',
    bgColor: 'bg-teal-50/30'
  },
  photo: {
    label: 'Care Photo',
    icon: Camera,
    dotColor: 'bg-purple-600 text-white',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50/30'
  }
};

export default function CareTimeline({ timeline = [], selectedDate }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredTimeline = activeFilter === 'all'
    ? timeline
    : timeline.filter(item => item.category === activeFilter);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* Timeline Header and Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Daily Care Timeline
          </h3>
          <p className="text-xs text-slate-500">
            Complete chronological record of all care events for {selectedDate}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'vital', label: 'Vitals' },
            { id: 'medicine', label: 'Meds' },
            { id: 'meal', label: 'Meals' },
            { id: 'activity', label: 'Activities' },
            { id: 'photo', label: 'Photos' },
            { id: 'observation', label: 'Nurse Notes' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === f.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Entries List */}
      {filteredTimeline.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">
          No care events recorded matching the filter for this day.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:top-3 before:bottom-3 before:left-3 sm:before:left-4 before:w-0.5 before:bg-slate-200">
          {filteredTimeline.map((item, index) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.observation;
            const Icon = meta.icon;

            return (
              <div key={item.id || index} className="relative group">
                {/* Milestone Node on Connecting Line */}
                <div className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm ring-4 ring-white ${meta.dotColor}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Event Card Content */}
                <div className={`rounded-xl border p-3.5 transition-all hover:shadow-sm ${meta.borderColor} ${meta.bgColor}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                        {meta.label}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatTimeIST(item.timestamp)}
                      </span>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center space-x-1.5 self-start sm:self-center">
                      {item.category === 'vital' && item.is_out_of_range && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          Out of Range
                        </span>
                      )}

                      {item.category === 'vital' && !item.is_out_of_range && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Normal
                        </span>
                      )}

                      {item.category === 'medicine' && item.status === 'missed' && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-600" />
                          Missed Dose
                        </span>
                      )}

                      {item.category === 'medicine' && item.status === 'given' && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Given
                        </span>
                      )}

                      {item.category === 'meal' && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {item.portion} portion
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Notes */}
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {item.title}
                  </h4>

                  {item.notes && item.category !== 'observation' && (
                    <p className="text-xs text-slate-600 mt-1 italic">
                      "{item.notes}"
                    </p>
                  )}

                  {item.note && (
                    <p className="text-xs text-slate-600 mt-1 italic">
                      "{item.note}"
                    </p>
                  )}

                  {item.category === 'observation' && (
                    <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                      {item.text}
                    </p>
                  )}

                  {item.category === 'photo' && item.file_path && (
                    <div className="mt-2.5 rounded-xl overflow-hidden max-w-xs border border-slate-200 bg-black/5 shadow-sm">
                      <img
                        src={item.file_path}
                        alt={item.caption || 'Care photo'}
                        className="w-full h-44 object-cover"
                      />
                      {item.caption && (
                        <div className="p-2 text-xs font-semibold text-slate-700 bg-white border-t border-slate-100">
                          {item.caption}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nurse attribution footer */}
                  {item.nurse_name && (
                    <div className="mt-2 text-[11px] text-slate-400">
                      Logged by {item.nurse_name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

