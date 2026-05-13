import type { CalculatorFormat } from '../types/content.types';

const currencyFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('en-ZA', {
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('en-ZA', {
  maximumFractionDigits: 0,
});

export const formatCurrency = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return currencyFormatter.format(n);
};

export const formatPercent = (n: number | null | undefined, fractionDigits = 1): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return `${n.toFixed(fractionDigits)}%`;
};

export const formatInteger = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return integerFormatter.format(n);
};

export const formatDecimal = (n: number | null | undefined, fractionDigits = 2): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return decimalFormatter.format(Number(n.toFixed(fractionDigits)));
};

export const formatByCalculatorFormat = (
  value: number,
  format?: CalculatorFormat
): string => {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'integer':
      return formatInteger(value);
    case 'decimal':
      return formatDecimal(value);
    default:
      return formatDecimal(value);
  }
};
