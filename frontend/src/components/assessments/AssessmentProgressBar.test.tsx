import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssessmentProgressBar } from './AssessmentProgressBar';

describe('AssessmentProgressBar', () => {
  it('renders the current/total label and percentage', () => {
    render(<AssessmentProgressBar current={3} total={10} />);
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  });

  it('clamps to 0% when total is zero', () => {
    render(<AssessmentProgressBar current={0} total={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
