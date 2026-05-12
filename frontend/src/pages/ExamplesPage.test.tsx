import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExamplesPage } from './ExamplesPage';

vi.mock('../services/content.service', () => ({
  contentService: {
    listExamples: vi.fn(),
  },
}));

describe('ExamplesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the ExampleBrowser', async () => {
    const { contentService } = await import('../services/content.service');
    vi.mocked(contentService.listExamples).mockResolvedValue({ examples: [], total: 0 });
    render(
      <MemoryRouter>
        <ExamplesPage />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /worked examples/i })).toBeInTheDocument()
    );
  });
});
