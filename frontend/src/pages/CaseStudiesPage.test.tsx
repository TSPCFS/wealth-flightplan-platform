import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CaseStudiesPage } from './CaseStudiesPage';

vi.mock('../services/content.service', () => ({
  contentService: {
    listCaseStudies: vi.fn(),
  },
}));

describe('CaseStudiesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders case studies and links each one to its detail route', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.listCaseStudies).mockResolvedValue({
      case_studies: [
        {
          study_code: 'CS-001',
          name: 'Susan & Johan',
          summary: 'R85k/month, R90k drain.',
          learning: 'Honest numbers + 20yr plan.',
          stage_relevance: ['Foundation'],
          related_step_numbers: ['1'],
        },
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <CaseStudiesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Susan & Johan')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /susan & johan/i })).toHaveAttribute(
      'href',
      '/case-studies/CS-001'
    );
  });

  it('shows the empty state when no studies match', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.listCaseStudies).mockResolvedValue({
      case_studies: [],
      total: 0,
    });
    render(
      <MemoryRouter>
        <CaseStudiesPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/No case studies match/)).toBeInTheDocument());
  });
});
