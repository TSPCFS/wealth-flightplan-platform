import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorksheetsCataloguePage } from './WorksheetsCataloguePage';
import type { WorksheetSubmission } from '../types/worksheet.types';

vi.mock('../services/worksheet.service', () => ({
  worksheetService: {
    list: vi.fn(),
    getLatest: vi.fn(),
  },
}));

const catalogue = {
  total: 2,
  worksheets: [
    {
      worksheet_code: 'APP-A' as const,
      title: 'Zero-Based Budget',
      description: 'Income − allocations = R0.',
      estimated_time_minutes: 30,
      has_calculator: true,
    },
    {
      worksheet_code: 'APP-B' as const,
      title: 'Net Worth Statement',
      description: 'Lifestyle vs income-generating.',
      estimated_time_minutes: 45,
      has_calculator: true,
    },
  ],
};

const draftSubmission: WorksheetSubmission = {
  worksheet_id: 'd1',
  worksheet_code: 'APP-A',
  is_draft: true,
  response_data: {},
  calculated_values: null,
  feedback: null,
  completion_percentage: 30,
  created_at: '2026-05-12T10:30:00Z',
  updated_at: '2026-05-12T10:30:00Z',
};

const submittedSubmission: WorksheetSubmission = {
  ...draftSubmission,
  worksheet_id: 's2',
  worksheet_code: 'APP-B',
  is_draft: false,
  completion_percentage: 100,
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
};

describe('WorksheetsCataloguePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a Draft saved badge for in-flight worksheets and a date badge for submitted ones', async () => {
    const { worksheetService } = await import('../services/worksheet.service');
    vi.mocked(worksheetService.list).mockResolvedValue(catalogue);
    vi.mocked(worksheetService.getLatest).mockImplementation((code) => {
      if (code === 'APP-A') return Promise.resolve(draftSubmission);
      if (code === 'APP-B') return Promise.resolve(submittedSubmission);
      return Promise.resolve(null);
    });

    render(
      <MemoryRouter>
        <WorksheetsCataloguePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Zero-Based Budget')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Draft saved')).toBeInTheDocument());
    expect(screen.getByText(/Last submitted/)).toBeInTheDocument();
  });

  it('shows an error message when the catalogue fetch fails', async () => {
    const { worksheetService } = await import('../services/worksheet.service');
    vi.mocked(worksheetService.list).mockRejectedValue(new Error('boom'));
    render(
      <MemoryRouter>
        <WorksheetsCataloguePage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });
});
