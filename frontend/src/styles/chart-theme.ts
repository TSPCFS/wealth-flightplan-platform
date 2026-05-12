// Centralised palette so chart colors stay consistent across calculators.
// Pairs with Tailwind blue/green/amber/red for chips and badges.

export const chartColors = {
  primary: '#2563eb', // blue-600
  primaryLight: '#bfdbfe', // blue-200
  secondary: '#10b981', // emerald-500
  secondaryLight: '#a7f3d0', // emerald-200
  warn: '#f59e0b', // amber-500
  warnLight: '#fde68a', // amber-200
  danger: '#dc2626', // red-600
  dangerLight: '#fecaca', // red-200
  neutral: '#6b7280', // gray-500
  grid: '#e5e7eb', // gray-200
};

export const targetPalette = ['#2563eb', '#10b981', '#f59e0b', '#dc2626', '#6366f1'];

// Stable mapping for net-worth pie segments.
export const netWorthColors = {
  lifestyle: chartColors.warn,
  income_generating: chartColors.secondary,
};

// Status → swatch for budget per-category bars.
export const budgetStatusColors: Record<'low' | 'on_track' | 'high', string> = {
  low: chartColors.warn,
  on_track: chartColors.secondary,
  high: chartColors.danger,
};
