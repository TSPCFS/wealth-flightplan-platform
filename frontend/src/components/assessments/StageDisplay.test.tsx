import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StageDisplay } from './StageDisplay';

describe('StageDisplay', () => {
  const stageDetails = {
    name: 'Freedom' as const,
    income_runway: '3-12 months',
    description: 'Mostly debt-free; consistently investing 20%+.',
  };

  it('renders stage, score, description and runway', () => {
    render(
      <StageDisplay
        calculatedStage="Freedom"
        previousStage="Momentum"
        stageDetails={stageDetails}
        totalScore={13}
      />
    );
    expect(screen.getByText('Freedom')).toBeInTheDocument();
    expect(screen.getByText('3-12 months')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText(/Mostly debt-free/)).toBeInTheDocument();
  });

  it('shows an upward delta when stage advanced', () => {
    render(
      <StageDisplay
        calculatedStage="Freedom"
        previousStage="Momentum"
        stageDetails={stageDetails}
        totalScore={13}
      />
    );
    const delta = screen.getByTestId('stage-delta');
    expect(delta).toHaveTextContent('Up from Momentum');
  });

  it('shows a downward delta when stage regressed', () => {
    render(
      <StageDisplay
        calculatedStage="Momentum"
        previousStage="Freedom"
        stageDetails={{ ...stageDetails, name: 'Momentum' }}
        totalScore={10}
      />
    );
    expect(screen.getByTestId('stage-delta')).toHaveTextContent('Down from Freedom');
  });

  it('marks the first placement when there is no previous stage', () => {
    render(
      <StageDisplay
        calculatedStage="Foundation"
        previousStage={null}
        stageDetails={{ ...stageDetails, name: 'Foundation' }}
        totalScore={7}
      />
    );
    expect(screen.getByTestId('stage-delta')).toHaveTextContent('First placement');
  });
});
