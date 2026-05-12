// Test-time stub for recharts. JSDOM has no layout, so the real
// ResponsiveContainer renders at 0×0 and skips its children. The stub
// renders a plain wrapper so chart sub-elements appear in the DOM and we
// can assert on them.

import React from 'react';
import { vi } from 'vitest';

vi.mock('recharts', async () => {
  const passthrough =
    (name: string) =>
    ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) =>
      React.createElement(
        'div',
        { 'data-recharts': name, ...(rest as Record<string, unknown>) },
        children as React.ReactNode
      );

  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        'div',
        { 'data-recharts': 'ResponsiveContainer', style: { width: 600, height: 300 } },
        children
      ),
    LineChart: passthrough('LineChart'),
    Line: passthrough('Line'),
    BarChart: passthrough('BarChart'),
    Bar: passthrough('Bar'),
    PieChart: passthrough('PieChart'),
    Pie: passthrough('Pie'),
    Cell: passthrough('Cell'),
    XAxis: passthrough('XAxis'),
    YAxis: passthrough('YAxis'),
    CartesianGrid: passthrough('CartesianGrid'),
    Tooltip: passthrough('Tooltip'),
    Legend: passthrough('Legend'),
  };
});
