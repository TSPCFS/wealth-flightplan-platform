import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorksheetResultsPage } from './WorksheetResultsPage';

vi.mock('../services/worksheet.service', () => ({
  worksheetService: {
    exportFile: vi.fn(),
    getSubmission: vi.fn(),
  },
}));

import { worksheetService } from '../services/worksheet.service';

const submission = {
  worksheet_id: 'sub-1',
  worksheet_code: 'APP-A' as const,
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
    status: 'on_track' as const,
    message: 'Great work.',
    recommendations: [],
  },
  completion_percentage: 100,
  created_at: '2026-05-12T10:30:00Z',
  updated_at: '2026-05-12T10:30:00Z',
};

describe('WorksheetResultsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the submission from router state without refetching', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/worksheets/results/sub-1', state: { submission } }]}>
        <Routes>
          <Route path="/worksheets/results/:id" element={<WorksheetResultsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/APP-A results/)).toBeInTheDocument();
    expect(screen.getByText('Great work.')).toBeInTheDocument();
    expect(worksheetService.getSubmission).not.toHaveBeenCalled();
  });

  it('refetches by id on deep-link / refresh and renders the submission', async () => {
    vi.mocked(worksheetService.getSubmission).mockResolvedValue(submission);

    render(
      <MemoryRouter initialEntries={['/worksheets/results/sub-1']}>
        <Routes>
          <Route path="/worksheets/results/:id" element={<WorksheetResultsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Great work.')).toBeInTheDocument();
    });
    expect(worksheetService.getSubmission).toHaveBeenCalledWith('sub-1');
  });

  it('shows a not-found message when the id is unknown or cross-user', async () => {
    vi.mocked(worksheetService.getSubmission).mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/worksheets/results/ghost-id']}>
        <Routes>
          <Route path="/worksheets/results/:id" element={<WorksheetResultsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Submission not found/i)).toBeInTheDocument();
    });
  });
});
