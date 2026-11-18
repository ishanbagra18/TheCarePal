import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { getQueuedActions, syncOfflineQueue } from '../../utils/offlineSync';
import api from '../../api/client';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncedMessage, setSyncedMessage] = useState('');

  const checkQueue = async () => {
    const list = await getQueuedActions();
    setQueueCount(list.length);
  };

  useEffect(() => {
    checkQueue();

    const handleOnline = async () => {
      setIsOnline(true);
      setSyncing(true);
      const res = await syncOfflineQueue(api);
      setSyncing(false);
      checkQueue();
      if (res.syncedCount > 0) {
        setSyncedMessage(`Back online! Synced ${res.syncedCount} queued care log(s) with the server.`);
        setTimeout(() => setSyncedMessage(''), 4000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check for queued items
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    const res = await syncOfflineQueue(api);
    setSyncing(false);
    checkQueue();
    if (res.syncedCount > 0) {
      setSyncedMessage(`Synced ${res.syncedCount} action(s) successfully.`);
      setTimeout(() => setSyncedMessage(''), 3000);
    }
  };

  if (isOnline && queueCount === 0 && !syncedMessage) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 animate-slide-down">
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 text-amber-200" />
            <span>
              <strong>Offline Mode:</strong> Internet disconnected. Care submissions will be queued in IndexedDB and synced automatically when reconnected.
              {queueCount > 0 && <span className="ml-1 bg-amber-800/80 px-2 py-0.5 rounded-full font-bold">({queueCount} queued)</span>}
            </span>
          </div>
        </div>
      )}

      {isOnline && queueCount > 0 && (
        <div className="bg-teal-700 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-teal-200" />
            <span>Connection restored! {queueCount} offline care log(s) waiting to sync.</span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center space-x-1 bg-white text-teal-800 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-teal-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      )}

      {syncedMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold shadow-md text-center">
          ✓ {syncedMessage}
        </div>
      )}
    </div>
  );
}

