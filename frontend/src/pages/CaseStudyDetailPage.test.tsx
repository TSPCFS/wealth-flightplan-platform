import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseStudyDetailPage } from './CaseStudyDetailPage';

vi.mock('../services/content.service', () => ({
  contentService: {
    getCaseStudy: vi.fn(),
  },
}));

const renderAt = (code: string) =>
  render(
    <MemoryRouter initialEntries={[`/case-studies/${code}`]}>
      <Routes>
        <Route path="/case-studies/:studyCode" element={<CaseStudyDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('CaseStudyDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders all sections + formatted income when present', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.getCaseStudy).mockResolvedValue({
      study_code: 'CS-001',
      name: 'Susan & Johan',
      age_band: '34/32',
      income_monthly: 85000,
      situation: 'Long-form situation text.',
      learning: 'Learning text.',
      key_insight: 'Key insight here.',
      stage_relevance: ['Foundation', 'Momentum'],
      related_step_numbers: ['1'],
      related_example_codes: ['WE-1'],
    });

    renderAt('CS-001');

    await waitFor(() => expect(screen.getByText('Susan & Johan')).toBeInTheDocument());
    expect(screen.getByText(/R\s?85\s?000\/month/)).toBeInTheDocument();
    expect(screen.getByText('Long-form situation text.')).toBeInTheDocument();
    expect(screen.getByText('Learning text.')).toBeInTheDocument();
    expect(screen.getByText('Key insight here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WE-1' })).toHaveAttribute(
      'href',
      '/examples/WE-1'
    );
  });

  it('shows "Not disclosed" when income_monthly is null', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.getCaseStudy).mockResolvedValue({
      study_code: 'CS-002',
      name: 'Anonymous',
      age_band: 'Senior/40s',
      income_monthly: null,
      situation: 's',
      learning: 'l',
      key_insight: 'k',
      stage_relevance: [],
      related_step_numbers: [],
      related_example_codes: [],
    });
    renderAt('CS-002');
    await waitFor(() => expect(screen.getByText(/Not disclosed/)).toBeInTheDocument());
  });
});
