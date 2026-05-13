import { useCallback, useEffect, useState } from 'react';
import type { AssessmentType } from '../types/assessment.types';

export const draftKey = (type: AssessmentType): string => `wfp.assessment.draft.${type}`;

interface DraftEnvelope {
  responses: Record<string, string>;
  index: number;
  startedAt: number;
}

const readDraft = (key: string): DraftEnvelope | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.responses !== 'object' ||
      typeof parsed.index !== 'number' ||
      typeof parsed.startedAt !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

interface UseAssessmentDraftResult {
  responses: Record<string, string>;
  index: number;
  startedAt: number;
  setResponse: (code: string, value: string) => void;
  setIndex: (next: number) => void;
  clear: () => void;
}

export const useAssessmentDraft = (type: AssessmentType): UseAssessmentDraftResult => {
  const key = draftKey(type);

  const [state, setState] = useState<DraftEnvelope>(() => {
    const restored = readDraft(key);
    return (
      restored ?? {
        responses: {},
        index: 0,
        startedAt: Date.now(),
      }
    );
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage quota / private mode: silently degrade; the assessment still works in-memory.
    }
  }, [key, state]);

  const setResponse = useCallback((code: string, value: string) => {
    setState((prev) => ({ ...prev, responses: { ...prev.responses, [code]: value } }));
  }, []);

  const setIndex = useCallback((next: number) => {
    setState((prev) => ({ ...prev, index: next }));
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setState({ responses: {}, index: 0, startedAt: Date.now() });
  }, [key]);

  return {
    responses: state.responses,
    index: state.index,
    startedAt: state.startedAt,
    setResponse,
    setIndex,
    clear,
  };
};
