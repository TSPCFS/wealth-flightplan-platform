// Tiny date formatter shared by activity feed + milestone cards.
// Inputs are ISO 8601 strings (date or datetime); outputs are short labels
// like "12s ago", "5d ago", "in 3d", "today".
const SECOND = 1;
const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export const relativeTimeFromIso = (iso: string, now: number = Date.now()): string => {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const deltaSeconds = Math.round((now - ts) / 1000);
  const abs = Math.abs(deltaSeconds);
  const future = deltaSeconds < 0;

  let value: number;
  let unit: string;
  if (abs < MINUTE) {
    value = Math.max(1, Math.round(abs / SECOND));
    unit = 's';
  } else if (abs < HOUR) {
    value = Math.round(abs / MINUTE);
    unit = 'm';
  } else if (abs < DAY) {
    value = Math.round(abs / HOUR);
    unit = 'h';
  } else {
    value = Math.round(abs / DAY);
    unit = 'd';
  }

  if (abs < MINUTE && !future) return 'just now';
  return future ? `in ${value}${unit}` : `${value}${unit} ago`;
};

export const formatShortDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
