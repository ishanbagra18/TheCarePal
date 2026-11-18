import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Stethoscope, Users, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'nurse',
    title: 'Nurse 1 (Priya Sharma)',
    email: 'nurse1@demo.com',
    password: 'Demo@123',
    patients: 'Assigned to Patient A (Ramesh) & B (Kamla)',
    badge: 'Nurse Role'
  },
  {
    role: 'nurse',
    title: 'Nurse 2 (Sunita Patel)',
    email: 'nurse2@demo.com',
    password: 'Demo@123',
    patients: 'Assigned to Patient C (Anil)',
    badge: 'Nurse Role'
  },
  {
    role: 'family',
    title: 'Family 1 (Amit Sharma)',
    email: 'family1@demo.com',
    password: 'Demo@123',
    patients: 'Son in Bangalore, linked to Patient A (Ramesh)',
    badge: 'Family Role'
  },
  {
    role: 'family',
    title: 'Family 2 (Meera Verma)',
    email: 'family2@demo.com',
    password: 'Demo@123',
    patients: 'Daughter in London, linked to Patient C (Anil)',
    badge: 'Family Role'
  }
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (res.user.role === 'nurse') {
        navigate('/nurse');
      } else {
        navigate('/family');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = async (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    setSubmitting(true);
    try {
      const res = await login(account.email, account.password);
      if (res.user.role === 'nurse') {
        navigate('/nurse');
      } else {
        navigate('/family');
      }
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <HeartPulse className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          TheCarePal
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Home Care Dashboard & Daily History for Families in India
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Main Card */}
        <div className="bg-white py-6 px-5 sm:px-8 shadow-sm border border-slate-200 rounded-2xl">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition shadow-sm"
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo Accounts Quick-Fill Section */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Demo Accounts (One-Click)
              </span>
              <span className="text-[11px] text-slate-500">Tap to test immediately</span>
            </div>

            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDemoFill(acc)}
                  disabled={submitting}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all group flex items-start justify-between"
                >
                  <div className="flex items-start space-x-2.5">
                    <div className={`mt-0.5 p-1.5 rounded-lg ${
                      acc.role === 'nurse' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                    }`}>
                      {acc.role === 'nurse' ? <Stethoscope className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-teal-700 flex items-center gap-1.5">
                        {acc.title}
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                          acc.role === 'nurse' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}>
                          {acc.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{acc.patients}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{acc.email} • Demo@123</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2 self-center">
                    Login →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security & Role Policy Footer */}
        <div className="mt-4 text-center text-xs text-slate-500">
          Enforced by server middleware: Nurses have scoped write access, Families have read-only access.
        </div>
      </div>
    </div>
  );
}

