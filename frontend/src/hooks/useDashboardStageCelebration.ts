import { useEffect, useState } from 'react';
import type { Stage } from '../types/assessment.types';

const LAST_STAGE_KEY = 'wfp.dashboard.lastStage';

const STAGE_ORDER: Stage[] = ['Foundation', 'Momentum', 'Freedom', 'Independence', 'Abundance'];

export type StageDirection = 'up' | 'down' | 'same' | 'first';

export const compareStages = (
  next: Stage | null,
  previous: Stage | null
): StageDirection => {
  if (!previous) return 'first';
  if (!next) return 'same';
  const a = STAGE_ORDER.indexOf(next);
  const b = STAGE_ORDER.indexOf(previous);
  if (a > b) return 'up';
  if (a < b) return 'down';
  return 'same';
};

export interface StageCelebration {
  previous: Stage | null;
  next: Stage;
  direction: 'up' | 'down';
}

interface Result {
  celebration: StageCelebration | null;
  dismiss: () => void;
}

// Detect a stage change relative to the value persisted in localStorage.
// Fires once per change: the moment the user dismisses, we persist the new
// stage so the same banner doesn't re-fire on every dashboard load.
//
// First-time users (no cached stage) DO NOT get a celebration; we silently
// cache their initial placement instead.
export const useDashboardStageCelebration = (currentStage: Stage | null): Result => {
  const [celebration, setCelebration] = useState<StageCelebration | null>(null);

  useEffect(() => {
    if (!currentStage) return;
    let cached: Stage | null = null;
    try {
      cached = (localStorage.getItem(LAST_STAGE_KEY) as Stage | null) ?? null;
    } catch {
      cached = null;
    }

    if (!cached) {
      // First-time placement: cache silently, no celebration.
      try {
        localStorage.setItem(LAST_STAGE_KEY, currentStage);
      } catch {
        // ignore quota / private mode
      }
      return;
    }

    if (cached === currentStage) {
      return; // unchanged
    }

    const direction = compareStages(currentStage, cached);
    if (direction === 'up' || direction === 'down') {
      setCelebration({ previous: cached, next: currentStage, direction });
    }
  }, [currentStage]);

  const dismiss = () => {
    if (!celebration) return;
    try {
      localStorage.setItem(LAST_STAGE_KEY, celebration.next);
    } catch {
      // ignore
    }
    setCelebration(null);
  };

  return { celebration, dismiss };
};
