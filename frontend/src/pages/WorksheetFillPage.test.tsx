import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorksheetFillPage } from './WorksheetFillPage';
import type { WorksheetSchema, WorksheetSubmission } from '../types/worksheet.types';

vi.mock('../services/worksheet.service', () => ({
  worksheetService: {
    getSchema: vi.fn(),
    getLatest: vi.fn(),
    saveDraft: vi.fn(),
    submit: vi.fn(),
  },
}));

const schema: WorksheetSchema = {
  worksheet_code: 'APP-A',
  title: 'Zero-Based Budget',
  description: '',
  sections: [
    {
      name: 'income',
      label: 'Income',
      fields: [
        { name: 'salary_1', label: 'Salary 1', type: 'number', min: 0, format: 'currency' },
      ],
    },
  ],
};

const draft: WorksheetSubmission = {
  worksheet_id: 'd1',
  worksheet_code: 'APP-A',
  is_draft: true,
  response_data: { income: { salary_1: 45000 } },
  calculated_values: null,
  feedback: null,
  completion_percentage: 50,
  created_at: '2026-05-12T10:30:00Z',
  updated_at: '2026-05-12T10:30:00Z',
};

const renderAt = (code: string) =>
  render(
    <MemoryRouter initialEntries={[`/worksheets/${code}`]}>
      <Routes>
        <Route path="/worksheets/:code" element={<WorksheetFillPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('WorksheetFillPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('restores a draft into the form when one is present', async () => {
    const { worksheetService } = await import('../services/worksheet.service');
    vi.mocked(worksheetService.getSchema).mockResolvedValue(schema);
    vi.mocked(worksheetService.getLatest).mockResolvedValue(draft);

    renderAt('APP-A');

    await waitFor(() =>
      expect((screen.getByLabelText('Salary 1') as HTMLInputElement).value).toBe('45000')
    );
  });

  it('starts a fresh form when only a submitted (non-draft) latest exists', async () => {
    const { worksheetService } = await import('../services/worksheet.service');
    vi.mocked(worksheetService.getSchema).mockResolvedValue(schema);
    vi.mocked(worksheetService.getLatest).mockResolvedValue({
      ...draft,
      is_draft: false,
      response_data: { income: { salary_1: 100000 } },
    });

    renderAt('APP-A');

    await waitFor(() => expect(screen.getByLabelText('Salary 1')).toBeInTheDocument());
    expect((screen.getByLabelText('Salary 1') as HTMLInputElement).value).toBe('');
  });

  it('rejects an unknown worksheet code', async () => {
    renderAt('APP-Z');
    await waitFor(() => expect(screen.getByText('Unknown worksheet')).toBeInTheDocument());
  });
});
