/**
 * Date and time formatting utilities for TheCarePal
 * Stores timestamps as ISO strings in UTC and displays them in IST (Asia/Kolkata).
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date formatted as YYYY-MM-DD in IST
 */
export function getTodayIST() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO UTC timestamp into readable IST time (e.g. "08:30 AM")
 */
export function formatTimeIST(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch (e) {
    return isoString;
  }
}

/**
 * Formats an ISO UTC timestamp or date string into readable IST date (e.g. "Wed, 18 Nov 2026")
 */
export function formatDateIST(isoString) {
  if (!isoString) return '';
  try {
    // If it's just YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
      const [y, m, d] = isoString.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: IST_TIMEZONE,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    }

    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch (e) {
    return isoString;
  }
}

/**
 * Formats a date relative to today ("Today", "Yesterday", or "18 Nov 2026")
 */
export function formatRelativeDate(dateStr) {
  const today = getTodayIST();
  if (dateStr === today) return 'Today';

  const d = new Date(dateStr);
  const t = new Date(today);
  const diffDays = Math.round((t - d) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Yesterday';
  if (diffDays === -1) return 'Tomorrow';

  return formatDateIST(dateStr);
}

