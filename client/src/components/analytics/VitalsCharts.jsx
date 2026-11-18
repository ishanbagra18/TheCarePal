import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  Dot
} from 'recharts';
import { NORMAL_RANGES } from '../../config/normalRanges';
import { formatDateIST, formatTimeIST } from '../../utils/date';
import api from '../../api/client';
import {
  Activity,
  Gauge,
  Heart,
  Droplet,
  Thermometer,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Calendar
} from 'lucide-react';

const VITAL_TABS = [
  { id: 'bp', label: 'Blood Pressure', unit: 'mmHg', icon: Gauge },
  { id: 'pulse', label: 'Pulse Rate', unit: 'bpm', icon: Heart },
  { id: 'spo2', label: 'Blood Oxygen (SpO2)', unit: '%', icon: Activity },
  { id: 'sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: Droplet },
  { id: 'temp', label: 'Temperature', unit: '°C', icon: Thermometer },
  { id: 'weight', label: 'Weight', unit: 'kg', icon: Scale },
];

// Custom Red Dot for Out-of-Range Points
const OutOfRangeDot = (props) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;

  if (payload.is_out_of_range) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill="#ef4444" fillOpacity={0.3} className="animate-ping" />
        <circle cx={cx} cy={cy} r={5} fill="#dc2626" stroke="#ffffff" strokeWidth={2} />
      </g>
    );
  }

  return <circle cx={cx} cy={cy} r={3.5} fill="#0d9488" stroke="#ffffff" strokeWidth={1.5} />;
};

export default function VitalsCharts({ patientId }) {
  const [days, setDays] = useState(7); // 7 or 30
  const [activeType, setActiveType] = useState('bp');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCharts() {
      setLoading(true);
      try {
        const res = await api.get(`/patients/${patientId}/charts/vitals?days=${days}`);
        setChartData(res);
      } catch (err) {
        console.error('Failed to load chart data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCharts();
  }, [patientId, days]);

  const activeTabMeta = VITAL_TABS.find(t => t.id === activeType) || VITAL_TABS[0];
  const rawList = chartData?.vitalsByType?.[activeType] || [];

  // Format data for Recharts
  const formattedData = rawList.map(v => {
    const d = new Date(v.timestamp);
    const dateLabel = `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
    const timeLabel = formatTimeIST(v.timestamp);

    return {
      ...v,
      displayDate: dateLabel,
      displayTime: timeLabel,
      systolic: v.type === 'bp' ? v.value : undefined,
      diastolic: v.type === 'bp' ? v.value2 : undefined,
      primaryValue: v.value,
    };
  });

  // Calculate summary metrics
  const values = formattedData.map(d => d.primaryValue).filter(v => typeof v === 'number');
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 0;
  const avgVal = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;
  const outOfRangeCount = formattedData.filter(d => d.is_out_of_range).length;

  const normalRange = NORMAL_RANGES[activeType];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      {/* Top Header: Title & 7-Day / 30-Day Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-teal-600" />
            <span>Vitals Clinical Trend Charts</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Green shaded bands depict clinical normal ranges. Abnormal readings are highlighted with red markers.
          </p>
        </div>

        {/* 7-day / 30-day Toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setDays(7)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              days === 7
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              days === 30
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Vital Type Switcher Buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {VITAL_TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition ${
                isSelected
                  ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20 shadow-sm'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
              <span className="truncate w-full text-center">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* KPI Stats Row for Active Vital */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Latest Reading</span>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {formattedData.length > 0 ? (
              activeType === 'bp' 
                ? `${formattedData[formattedData.length - 1].systolic}/${formattedData[formattedData.length - 1].diastolic} mmHg`
                : `${formattedData[formattedData.length - 1].primaryValue} ${activeTabMeta.unit}`
            ) : 'N/A'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Normal Target</span>
          <div className="text-base font-bold text-teal-800 mt-0.5">
            {activeType === 'bp' ? '90-140 / 60-90' :
             activeType === 'pulse' ? '60 - 100 bpm' :
             activeType === 'spo2' ? '95 - 100 %' :
             activeType === 'sugar' ? '70 - 140 mg/dL' :
             activeType === 'temp' ? '36.1 - 37.5 °C' : 'Trend Only'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Period Average</span>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {avgVal} {activeTabMeta.unit}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Out of Range</span>
          <div className={`text-base font-bold mt-0.5 flex items-center gap-1 ${
            outOfRangeCount > 0 ? 'text-red-600' : 'text-emerald-600'
          }`}>
            {outOfRangeCount > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                {outOfRangeCount} readings
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                All Normal
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      {loading ? (
        <div className="h-72 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : formattedData.length === 0 ? (
        <div className="h-72 flex flex-col items-center justify-center text-sm text-slate-400">
          <Activity className="w-8 h-8 text-slate-300 mb-2" />
          No {activeTabMeta.label} readings recorded in the last {days} days.
        </div>
      ) : (
        <div className="h-72 sm:h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              
              <YAxis
                domain={
                  activeType === 'spo2' ? [90, 100] :
                  activeType === 'sugar' ? [60, 'auto'] :
                  activeType === 'bp' ? [50, 180] :
                  activeType === 'temp' ? [35.5, 39.0] :
                  ['auto', 'auto']
                }
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                        <div className="font-semibold text-slate-300">
                          {data.displayDate} at {data.displayTime}
                        </div>
                        {activeType === 'bp' ? (
                          <div className="text-sm font-bold text-teal-300">
                            BP: {data.systolic} / {data.diastolic} mmHg
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-teal-300">
                            {data.primaryValue} {activeTabMeta.unit}
                          </div>
                        )}
                        {data.is_out_of_range ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-red-500 text-white font-bold text-[10px]">
                            OUT OF RANGE
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500 text-white font-bold text-[10px]">
                            NORMAL
                          </span>
                        )}
                        {data.notes && (
                          <div className="text-[11px] text-slate-400 italic pt-1">
                            "{data.notes}"
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Shaded Normal Range Band using ReferenceArea (Except for Weight which has no band) */}
              {activeType === 'bp' && (
                <>
                  <ReferenceArea
                    y1={normalRange.systolic.min}
                    y2={normalRange.systolic.max}
                    fill="#10b981"
                    fillOpacity={0.08}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                    strokeDasharray="3 3"
                  />
                  <ReferenceArea
                    y1={normalRange.diastolic.min}
                    y2={normalRange.diastolic.max}
                    fill="#3b82f6"
                    fillOpacity={0.08}
                    stroke="#3b82f6"
                    strokeOpacity={0.3}
                    strokeDasharray="3 3"
                  />
                </>
              )}

              {activeType !== 'bp' && normalRange?.min !== undefined && (
                <ReferenceArea
                  y1={normalRange.min}
                  y2={normalRange.max}
                  fill="#10b981"
                  fillOpacity={0.12}
                  stroke="#10b981"
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
              )}

              {/* Lines and Highlight Dots */}
              {activeType === 'bp' ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    name="Systolic"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={<OutOfRangeDot />}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    name="Diastolic"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3b82f6' }}
                    activeDot={{ r: 5 }}
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="primaryValue"
                  name={activeTabMeta.label}
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={<OutOfRangeDot />}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

