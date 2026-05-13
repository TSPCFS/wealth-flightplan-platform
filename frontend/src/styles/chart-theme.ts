// Centralised chart palette tracking the attooh! brand tokens. Recharts
// gets the exact hex values that match MOCKUP.html so the line + bar +
// pie chart colours read the same as everything else on the page.

export const chartColors = {
  // Lime primary (Balance / featured series).
  primary: '#7AB016',       // attooh-lime-hover (deeper for line stroke)
  primaryLight: '#F0F7DE',  // attooh-lime-pale (area fill, soft swatches)
  // Deeper green for "growth" / on-track companion series.
  secondary: '#4F9C2C',     // attooh-success
  secondaryLight: '#D6ECC8',
  // Warm warn / cool slate for the third + neutral series.
  warn: '#E8A93A',          // attooh-warn
  warnLight: '#FBE7BA',
  danger: '#C7363B',        // attooh-danger
  dangerLight: '#F4CCCD',
  neutral: '#505E6B',       // attooh-slate (used as dashed Contributions line)
  grid: '#E8E8E4',          // attooh-border
};

export const targetPalette = ['#7AB016', '#4F9C2C', '#E8A93A', '#C7363B', '#505E6B'];

// Stable mapping for net-worth pie segments. Lifestyle = warn-amber (the
// "consumer" half); income-generating = lime-success.
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
