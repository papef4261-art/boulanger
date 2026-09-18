import { useState, useEffect } from 'react';

/**
 * Returns YYYY-MM-DD in the user's local timezone (safe from UTC offset shifts)
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns formatted time string in local HH:MM:SS
 */
export function getLocalTimeString(d: Date = new Date()): string {
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Formats a YYYY-MM-DD date into full French text (e.g. "mercredi 2 septembre 2026")
 */
export function formatFrenchDateLong(dateString: string): string {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    }
    return dateString;
  } catch {
    return dateString;
  }
}

/**
 * Formats date and time into French string (e.g. "2 septembre 2026 à 14:35:10")
 */
export function formatFrenchDateTime(d: Date = new Date()): string {
  try {
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
    const timeFormatted = getLocalTimeString(d);
    return `${dateFormatted} à ${timeFormatted}`;
  } catch {
    return d.toLocaleString('fr-FR');
  }
}

/**
 * Relative offset in days from today's local date
 */
export function getOffsetDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return getLocalDateString(d);
}

/**
 * Custom React hook for live auto-updating date and clock
 * Updates state every 1,000ms and detects midnight roll-overs automatically.
 */
export function useLiveDateTime() {
  const [now, setNow] = useState<Date>(() => new Date());
  const [todayStr, setTodayStr] = useState<string>(() => getLocalDateString());
  const [timeStr, setTimeStr] = useState<string>(() => getLocalTimeString());
  const [formattedDateLong, setFormattedDateLong] = useState<string>(() => 
    formatFrenchDateLong(getLocalDateString())
  );
  const [lastSyncTime, setLastSyncTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = new Date();
      setNow(current);
      
      const newTodayStr = getLocalDateString(current);
      setTodayStr(newTodayStr);
      setTimeStr(getLocalTimeString(current));
      setFormattedDateLong(formatFrenchDateLong(newTodayStr));
      setLastSyncTime(current);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const refreshNow = () => {
    const current = new Date();
    setNow(current);
    const newTodayStr = getLocalDateString(current);
    setTodayStr(newTodayStr);
    setTimeStr(getLocalTimeString(current));
    setFormattedDateLong(formatFrenchDateLong(newTodayStr));
    setLastSyncTime(current);
  };

  return {
    now,
    todayStr,
    timeStr,
    formattedDateLong,
    lastSyncTime,
    refreshNow,
  };
}
