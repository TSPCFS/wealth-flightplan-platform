import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssessmentsPage } from './AssessmentsPage';

describe('AssessmentsPage', () => {
  it('renders the AssessmentSelector', () => {
    render(
      <MemoryRouter>
        <AssessmentsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Choose an assessment')).toBeInTheDocument();
    expect(screen.getByText('5-Question Quick Check')).toBeInTheDocument();
  });
});
