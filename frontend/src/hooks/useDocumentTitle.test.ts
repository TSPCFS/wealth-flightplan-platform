import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.title = 'initial';
  });

  it('sets document.title with the brand suffix', () => {
    renderHook(() => useDocumentTitle('Dashboard'));
    expect(document.title).toBe('Dashboard — Wealth FlightPlan™');
  });

  it('restores the previous title on unmount', () => {
    document.title = 'before';
    const { unmount } = renderHook(() => useDocumentTitle('Dashboard'));
    expect(document.title).toBe('Dashboard — Wealth FlightPlan™');
    unmount();
    expect(document.title).toBe('before');
  });

  it('skips the update when title is null', () => {
    document.title = 'untouched';
    renderHook(() => useDocumentTitle(null));
    expect(document.title).toBe('untouched');
  });

  it('updates when the title prop changes', () => {
    const { rerender } = renderHook(({ t }: { t: string | null }) => useDocumentTitle(t), {
      initialProps: { t: 'First' },
    });
    expect(document.title).toBe('First — Wealth FlightPlan™');
    rerender({ t: 'Second' });
    expect(document.title).toBe('Second — Wealth FlightPlan™');
  });
});
