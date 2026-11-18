import React from 'react';
import { useAuth } from '../context/AuthContext';
import PatientSwitcher from './PatientSwitcher';
import { HeartPulse, LogOut, ShieldAlert } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isNurse = user.role === 'nurse';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-sm">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">TheCarePal</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                isNurse ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-teal-100 text-teal-800 border border-teal-200'
              }`}>
                {isNurse ? 'Nurse Portal' : 'Family Portal'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Compassionate Home Care Dashboard</p>
          </div>
        </div>

        {/* Center: Patient Switcher */}
        <div className="flex items-center">
          <PatientSwitcher />
        </div>

        {/* Right: User Profile & Logout */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">{user.name}</div>
            <div className="text-[11px] text-slate-500">{user.email}</div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

