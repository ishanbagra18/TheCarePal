import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, ChevronDown } from 'lucide-react';

export default function PatientSwitcher() {
  const { accessiblePatients, selectedPatientId, selectPatient } = useAuth();

  if (!accessiblePatients || accessiblePatients.length <= 1) {
    if (accessiblePatients.length === 1) {
      const p = accessiblePatients[0];
      return (
        <div className="flex items-center space-x-2 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-full text-xs font-medium text-brand-900">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Care for: <strong className="font-semibold">{p.name}</strong> ({p.condition.split('&')[0].trim()})</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="relative inline-flex items-center">
      <label htmlFor="patient-switcher" className="sr-only">Switch Patient</label>
      <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm text-xs focus-within:ring-2 focus-within:ring-teal-500">
        <UserCheck className="w-4 h-4 text-teal-600 mr-2 flex-shrink-0" />
        <span className="text-slate-500 mr-1.5 hidden sm:inline">Patient:</span>
        <select
          id="patient-switcher"
          value={selectedPatientId || ''}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-transparent font-semibold text-slate-800 pr-6 focus:outline-none cursor-pointer"
        >
          {accessiblePatients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.city})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

