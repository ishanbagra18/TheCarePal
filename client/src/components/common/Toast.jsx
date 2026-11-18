import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-md z-50 animate-bounce-in">
      <div className={`p-4 rounded-xl shadow-lg border flex items-start space-x-3 text-sm ${
        isError ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        {isError ? (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="font-semibold">{toast.title || (isError ? 'Error' : 'Success')}</p>
          <p className="text-xs mt-0.5 opacity-90">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

