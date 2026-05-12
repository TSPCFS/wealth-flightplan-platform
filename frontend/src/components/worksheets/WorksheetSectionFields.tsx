import React from 'react';
import type { CalculatorInputSpec } from '../../types/content.types';
import { formatCurrency } from '../../utils/format';

interface Props {
  fields: CalculatorInputSpec[];
  value: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldName: string, next: unknown) => void;
  sectionTotal?: number;
}

const normaliseOptions = (
  options: CalculatorInputSpec['options']
): { value: string; label: string }[] => {
  if (!options) return [];
  return options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
};

export const WorksheetSectionFields: React.FC<Props> = ({
  fields,
  value,
  errors,
  onChange,
  sectionTotal,
}) => (
  <div className="space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((field) => {
        const fieldError = errors[field.name];
        const fieldValue = value[field.name];
        const inputId = `field-${field.name}`;
        const baseInput =
          'mt-1 block w-full min-h-[44px] px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500';
        const borderCls = fieldError ? 'border-red-400' : 'border-gray-300';

        return (
          <div key={field.name}>
            <label htmlFor={inputId} className="block">
              <span className="text-sm font-medium text-gray-700">{field.label}</span>
              {field.type === 'select' ? (
                <select
                  id={inputId}
                  value={(fieldValue as string) ?? ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className={`${baseInput} ${borderCls} bg-white`}
                >
                  <option value="">Select…</option>
                  {normaliseOptions(field.options).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'text' ? (
                <input
                  id={inputId}
                  type="text"
                  value={(fieldValue as string) ?? ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className={`${baseInput} ${borderCls}`}
                />
              ) : (
                <input
                  id={inputId}
                  type="number"
                  value={(fieldValue as number | string | undefined) ?? ''}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 'any'}
                  onChange={(e) =>
                    onChange(
                      field.name,
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className={`${baseInput} ${borderCls}`}
                />
              )}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {fieldError && (
              <p role="alert" className="text-xs text-red-600 mt-1">
                {fieldError}
              </p>
            )}
          </div>
        );
      })}
    </div>
    {sectionTotal !== undefined && fields.some((f) => f.type === 'number') && (
      <p className="text-sm text-gray-600 text-right">
        Section total:{' '}
        <span className="font-semibold text-gray-900">{formatCurrency(sectionTotal)}</span>
      </p>
    )}
  </div>
);
