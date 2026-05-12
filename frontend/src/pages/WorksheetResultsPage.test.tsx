import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorksheetResultsPage } from './WorksheetResultsPage';

vi.mock('../services/worksheet.service', () => ({
  worksheetService: {
    exportFile: vi.fn(),
  },
}));

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

  it('renders the submission from router state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/worksheets/results/sub-1', state: { submission } }]}>
        <Routes>
          <Route path="/worksheets/results/:id" element={<WorksheetResultsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/APP-A results/)).toBeInTheDocument();
    expect(screen.getByText('Great work.')).toBeInTheDocument();
  });

  it('shows a friendly fallback when state is missing (deep-link)', () => {
    render(
      <MemoryRouter initialEntries={['/worksheets/results/sub-1']}>
        <Routes>
          <Route path="/worksheets/results/:id" element={<WorksheetResultsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(
      screen.getByText(/re-open submission sub-1 from the worksheet history/i)
    ).toBeInTheDocument();
  });
});
