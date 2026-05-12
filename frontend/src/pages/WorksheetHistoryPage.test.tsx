import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorksheetHistoryPage } from './WorksheetHistoryPage';

vi.mock('../services/worksheet.service', () => ({
  worksheetService: {
    getHistory: vi.fn(),
  },
}));

const renderAt = (code: string) =>
  render(
    <MemoryRouter initialEntries={[`/worksheets/${code}/history`]}>
      <Routes>
        <Route path="/worksheets/:code/history" element={<WorksheetHistoryPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('WorksheetHistoryPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders submissions with headline values', async () => {
    const { worksheetService } = await import('../services/worksheet.service');
    vi.mocked(worksheetService.getHistory).mockResolvedValue({
      worksheet_code: 'APP-A',
      submissions: [
        {
          worksheet_id: 'sub-1',
          completion_percentage: 100,
          calculated_values_summary: { surplus_deficit: 0, needs_pct: 71.1 },
          created_at: '2026-05-12T10:30:00Z',
        },
      ],
    });
    renderAt('APP-A');

    await waitFor(() => expect(screen.getByText(/Surplus Deficit/)).toBeInTheDocument());
    expect(screen.getByText(/71\.1%/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/worksheets/results/sub-1'
    );
  });

  it('shows an empty state when there are no submissions', async () => {
    const { worksheetService } = await import('../services/worksheet.service');
    vi.mocked(worksheetService.getHistory).mockResolvedValue({
      worksheet_code: 'APP-A',
      submissions: [],
    });
    renderAt('APP-A');
    await waitFor(() => expect(screen.getByText('No submissions yet.')).toBeInTheDocument());
  });

  it('rejects an unknown worksheet code', async () => {
    renderAt('APP-Z');
    await waitFor(() => expect(screen.getByText('Unknown worksheet')).toBeInTheDocument());
  });
});
