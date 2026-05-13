import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssessmentSelector } from './AssessmentSelector';

describe('AssessmentSelector', () => {
  it('renders all three assessment cards with links', () => {
    render(
      <MemoryRouter>
        <AssessmentSelector />
      </MemoryRouter>
    );
    expect(screen.getByText('5-Question Quick Check')).toBeInTheDocument();
    expect(screen.getByText('10-Question Full Assessment')).toBeInTheDocument();
    expect(screen.getByText('GAP Test™')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /5-Question/i })).toHaveAttribute(
      'href',
      '/assessments/5q'
    );
  });

  it('mounts inside <main id="main">', () => {
    render(
      <MemoryRouter>
        <AssessmentSelector />
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});
