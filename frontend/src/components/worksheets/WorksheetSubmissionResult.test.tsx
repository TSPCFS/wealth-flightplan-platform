import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorksheetSubmissionResult } from './WorksheetSubmissionResult';
import type { WorksheetSubmission } from '../../types/worksheet.types';

vi.mock('../../services/worksheet.service', () => ({
  worksheetService: {
    exportFile: vi.fn(),
  },
}));

const submission: WorksheetSubmission = {
  worksheet_id: 'sub-1',
  worksheet_code: 'APP-A',
  is_draft: false,
  response_data: {},
  calculated_values: {
    total_income: 45000,
    needs_pct: 71.1,
    wants_pct: 7.8,
    invest_pct: 21.1,
    surplus_deficit: 0,
    status: 'balanced',
  },
  feedback: {
    status: 'needs_attention',
    message: 'Needs exceeds 50%.',
    recommendations: ['Review bond'],
  },
  completion_percentage: 100,
  created_at: '2026-05-12T10:30:00Z',
  updated_at: '2026-05-12T10:30:00Z',
};

const renderResult = (sub = submission) =>
  render(
    <MemoryRouter>
      <WorksheetSubmissionResult submission={sub} />
    </MemoryRouter>
  );

describe('WorksheetSubmissionResult', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the status banner and the per-code subresult', () => {
    renderResult();
    expect(screen.getByRole('status')).toHaveTextContent(/Needs attention/i);
    expect(screen.getByText('Needs exceeds 50%.')).toBeInTheDocument();
    expect(screen.getByText('Surplus / deficit')).toBeInTheDocument();
  });

  it('triggers exportFile on PDF/CSV buttons', async () => {
    const { worksheetService } = await import('../../services/worksheet.service');
    vi.mocked(worksheetService.exportFile).mockResolvedValue();

    renderResult();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /export as pdf/i }));
    });
    await waitFor(() =>
      expect(worksheetService.exportFile).toHaveBeenCalledWith('sub-1', 'pdf')
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /export as csv/i }));
    });
    await waitFor(() =>
      expect(worksheetService.exportFile).toHaveBeenCalledWith('sub-1', 'csv')
    );
  });

  it('surfaces an error when export fails', async () => {
    const { worksheetService } = await import('../../services/worksheet.service');
    vi.mocked(worksheetService.exportFile).mockRejectedValue(new Error('export hiccup'));

    renderResult();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /export as pdf/i }));
    });
    await waitFor(() => expect(screen.getByText('export hiccup')).toBeInTheDocument());
  });
});
