import React from 'react';
import type { CalculatorInputSpec } from '../../types/content.types';
import { Button } from '../common/Button';

interface Props {
  spec: CalculatorInputSpec;
  value: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}

const blankRow = (columns: CalculatorInputSpec[]): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  for (const col of columns) {
    if (col.type === 'number') row[col.name] = 0;
    else row[col.name] = '';
  }
  return row;
};

const formatLabel = (label?: string, format?: string): string => {
  if (!label) return '';
  if (format === 'currency') return `${label} (R)`;
  if (format === 'percent') return `${label} (%)`;
  return label;
};

export const ArrayInput: React.FC<Props> = ({ spec, value, onChange }) => {
  const columns = spec.item_schema ?? [];
  const rows = value ?? [];
  const minItems = spec.min_items ?? 0;
  const maxItems = spec.max_items ?? 50;
  const canAdd = rows.length < maxItems;
  const canRemove = rows.length > minItems;

  const updateCell = (rowIdx: number, colName: string, raw: string, colType: string) => {
    const next = rows.map((r, i) => {
      if (i !== rowIdx) return r;
      const cell = colType === 'number' ? (raw === '' ? 0 : Number(raw)) : raw;
      return { ...r, [colName]: cell };
    });
    onChange(next);
  };

  const addRow = () => onChange([...rows, blankRow(columns)]);
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <fieldset className="sm:col-span-2 space-y-2">
      <legend className="font-lato font-bold text-[11px] uppercase tracking-[0.1em] text-attooh-slate">
        {spec.label}
      </legend>
      {/* Right-edge gradient mask hints at horizontal scroll when the table
          overflows on narrow viewports. Pure CSS, no JS scroll detection. */}
      <div className="relative">
        <div className="overflow-x-auto" data-testid="array-input-scroll">
          <table className="min-w-full text-sm" aria-label={spec.label}>
          <thead>
            <tr className="text-left font-lato text-xs text-attooh-slate uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.name} className="pb-2 pr-3 font-bold">
                  {formatLabel(col.label, col.format)}
                </th>
              ))}
              <th className="pb-2 w-10" aria-label="row controls" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-t border-attooh-border">
                {columns.map((col) => (
                  <td key={col.name} className="py-2 pr-3 align-middle">
                    <input
                      type={col.type === 'number' ? 'number' : 'text'}
                      value={(row[col.name] as string | number | undefined) ?? ''}
                      min={col.min}
                      max={col.max}
                      step={col.step ?? (col.type === 'number' ? 'any' : undefined)}
                      onChange={(e) =>
                        updateCell(rowIdx, col.name, e.target.value, col.type)
                      }
                      aria-label={`${spec.label} row ${rowIdx + 1} ${col.label ?? col.name}`}
                      className="block w-full min-h-[44px] px-2.5 py-1.5 border-[1.5px] border-attooh-border rounded-lg text-sm bg-white transition focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale"
                    />
                  </td>
                ))}
                <td className="py-2 align-middle">
                  <button
                    type="button"
                    onClick={() => removeRow(rowIdx)}
                    disabled={!canRemove}
                    aria-label={`Remove ${spec.label} row ${rowIdx + 1}`}
                    className="text-attooh-muted hover:text-attooh-danger disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none min-h-[44px] min-w-[44px]"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {/* Right-edge fade: purely decorative scroll affordance. pointer-events-none
            so the underlying inputs stay clickable. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={addRow} disabled={!canAdd}>
          + Add row
        </Button>
        <span className="text-xs text-attooh-muted">
          {rows.length} / {maxItems} rows
        </span>
      </div>
    </fieldset>
  );
};
