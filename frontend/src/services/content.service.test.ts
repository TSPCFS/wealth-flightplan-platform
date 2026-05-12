import { describe, it, expect, vi } from 'vitest';
import { contentService } from './content.service';

vi.mock('./api', () => ({
  ACCESS_TOKEN_KEY: 'wfp.access_token',
  REFRESH_TOKEN_KEY: 'wfp.refresh_token',
  apiClient: {
    getFramework: vi.fn(),
    getStep: vi.fn(),
    listExamples: vi.fn(),
    getExample: vi.fn(),
    calculateExample: vi.fn(),
    listCaseStudies: vi.fn(),
    getCaseStudy: vi.fn(),
  },
}));

describe('contentService', () => {
  it('delegates each method to the apiClient with the right arguments', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.getFramework).mockResolvedValue({ steps: [] });
    vi.mocked(apiClient.getStep).mockResolvedValue({
      step_number: '1',
      title: 't',
      subtitle: 's',
      description: 'd',
      key_metrics: [],
      time_estimate_minutes: 0,
      stage_relevance: [],
      related_example_codes: [],
      related_worksheet_codes: [],
    });
    vi.mocked(apiClient.listExamples).mockResolvedValue({ examples: [], total: 0 });
    vi.mocked(apiClient.getExample).mockResolvedValue({
      example_code: 'WE-1',
      title: 't',
      step_number: '1',
      chapter: 'c',
      description: '',
      key_principle: '',
      key_takeaway: '',
      educational_text: '',
      stage_relevance: [],
      calculator_type: null,
      calculator_config: null,
      related_example_codes: [],
    });
    vi.mocked(apiClient.calculateExample).mockResolvedValue({
      example_code: 'WE-3',
      calculator_type: 'compound_interest',
      inputs: {
        monthly_contribution: 5000,
        years: 25,
        annual_rate_pct: 10,
      },
      outputs: {
        final_amount: 0,
        total_contributed: 0,
        total_growth: 0,
        monthly_passive_income: 0,
        year_by_year: [],
      },
      interpretation: '',
    });
    vi.mocked(apiClient.listCaseStudies).mockResolvedValue({ case_studies: [], total: 0 });
    vi.mocked(apiClient.getCaseStudy).mockResolvedValue({
      study_code: 'CS-1',
      name: 'n',
      age_band: 'a',
      income_monthly: null,
      situation: '',
      learning: '',
      key_insight: '',
      stage_relevance: [],
      related_step_numbers: [],
      related_example_codes: [],
    });

    await contentService.getFramework();
    await contentService.getStep('1');
    await contentService.listExamples({ step_number: '6' });
    await contentService.getExample('WE-1');
    await contentService.calculate<'compound_interest'>('WE-3', {
      monthly_contribution: 5000,
      years: 25,
      annual_rate_pct: 10,
    });
    await contentService.listCaseStudies({ stage: 'Foundation' });
    await contentService.getCaseStudy('CS-1');

    expect(apiClient.getFramework).toHaveBeenCalled();
    expect(apiClient.getStep).toHaveBeenCalledWith('1');
    expect(apiClient.listExamples).toHaveBeenCalledWith({ step_number: '6' });
    expect(apiClient.getExample).toHaveBeenCalledWith('WE-1');
    expect(apiClient.calculateExample).toHaveBeenCalledWith(
      'WE-3',
      expect.objectContaining({ monthly_contribution: 5000 })
    );
    expect(apiClient.listCaseStudies).toHaveBeenCalledWith({ stage: 'Foundation' });
    expect(apiClient.getCaseStudy).toHaveBeenCalledWith('CS-1');
  });
});
