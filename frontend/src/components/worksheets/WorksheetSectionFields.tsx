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
          'mt-1.5 block w-full min-h-[44px] px-3.5 py-2.5 border-[1.5px] rounded-lg text-sm bg-white transition focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale';
        const borderCls = fieldError ? 'border-attooh-danger' : 'border-attooh-border';

        return (
          <div key={field.name}>
            <label htmlFor={inputId} className="block">
              <span className="font-lato font-bold text-[11px] uppercase tracking-[0.1em] text-attooh-slate">
                {field.label}
              </span>
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
              <p className="text-xs text-attooh-muted mt-1">{field.description}</p>
            )}
            {fieldError && (
              <p role="alert" className="text-xs text-attooh-danger mt-1">
                {fieldError}
              </p>
            )}
          </div>
        );
      })}
    </div>
    {sectionTotal !== undefined && fields.some((f) => f.type === 'number') && (
      <p className="text-sm text-attooh-muted text-right">
        Section total:{' '}
        <span className="font-bold text-attooh-charcoal">{formatCurrency(sectionTotal)}</span>
      </p>
    )}
  </div>
);
