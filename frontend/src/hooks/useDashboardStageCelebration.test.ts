import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardStageCelebration, compareStages } from './useDashboardStageCelebration';

const KEY = 'wfp.dashboard.lastStage';

describe('useDashboardStageCelebration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('caches the first-time placement silently without celebrating', () => {
    const { result } = renderHook(() => useDashboardStageCelebration('Foundation'));
    expect(result.current.celebration).toBeNull();
    expect(localStorage.getItem(KEY)).toBe('Foundation');
  });

  it('fires once on stage up-shift and persists on dismiss', () => {
    localStorage.setItem(KEY, 'Foundation');
    const { result, rerender } = renderHook(
      ({ stage }: { stage: 'Foundation' | 'Freedom' | null }) =>
        useDashboardStageCelebration(stage),
      { initialProps: { stage: 'Freedom' } }
    );
    expect(result.current.celebration).toEqual({
      previous: 'Foundation',
      next: 'Freedom',
      direction: 'up',
    });
    act(() => result.current.dismiss());
    expect(result.current.celebration).toBeNull();
    expect(localStorage.getItem(KEY)).toBe('Freedom');

    // Same stage on next mount — no celebration
    rerender({ stage: 'Freedom' });
    expect(result.current.celebration).toBeNull();
  });

  it('fires a downward celebration when the stage regresses', () => {
    localStorage.setItem(KEY, 'Freedom');
    const { result } = renderHook(() => useDashboardStageCelebration('Momentum'));
    expect(result.current.celebration).toEqual({
      previous: 'Freedom',
      next: 'Momentum',
      direction: 'down',
    });
  });

  it('does nothing when current_stage is null', () => {
    const { result } = renderHook(() => useDashboardStageCelebration(null));
    expect(result.current.celebration).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('compareStages handles every direction', () => {
    expect(compareStages('Freedom', 'Foundation')).toBe('up');
    expect(compareStages('Foundation', 'Freedom')).toBe('down');
    expect(compareStages('Freedom', 'Freedom')).toBe('same');
    expect(compareStages('Freedom', null)).toBe('first');
  });
});
