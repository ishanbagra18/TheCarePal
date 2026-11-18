/**
 * Offline Sync Engine using browser IndexedDB.
 * Queues nurse care submissions when offline and automatically replays
 * them with client-generated IDs to guarantee zero duplicate submissions.
 */

const DB_NAME = 'CarePal_OfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_actions';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enqueue an action to be synchronized later
 */
export async function enqueueOfflineAction(action) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        ...action,
        id: action.id || `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        queuedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to enqueue offline action:', e);
    return null;
  }
}

/**
 * Get all queued offline actions
 */
export async function getQueuedActions() {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

/**
 * Delete a synced action from IndexedDB
 */
export async function removeQueuedAction(id) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

/**
 * Process the offline queue when internet connection is restored
 */
export async function syncOfflineQueue(api) {
  const queued = await getQueuedActions();
  if (queued.length === 0) return { syncedCount: 0 };

  let successCount = 0;

  for (const item of queued) {
    try {
      if (item.method === 'POST') {
        await api.post(item.endpoint, { ...item.body, id: item.id });
      } else if (item.method === 'PUT') {
        await api.put(item.endpoint, item.body);
      }
      await removeQueuedAction(item.id);
      successCount++;
    } catch (err) {
      console.warn(`Failed to sync queued action ${item.id}:`, err.message);
    }
  }

  return { syncedCount: successCount, remainingCount: queued.length - successCount };
}

