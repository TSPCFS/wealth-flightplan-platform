import React, { useState } from 'react';

export const INTRO_DISMISSED_KEY = 'wfp.dashboard.introDismissed';

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(INTRO_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

const persistDismissed = (): void => {
  try {
    localStorage.setItem(INTRO_DISMISSED_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
};

// First-run intro card. The parent decides *when* to show it (only on empty-state
// dashboards); this component owns the per-device dismissal flag so a tester
// who clicks ×, then triggers another empty state later (e.g. via Reset), does
// NOT see the card a second time. Styled with the attooh! lime accent.
export const FirstRunIntro: React.FC = () => {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  if (dismissed) return null;

  const onDismiss = () => {
    persistDismissed();
    setDismissed(true);
  };

  return (
    <section
      aria-labelledby="intro-title"
      className="relative bg-attooh-lime-pale border-l-4 border-attooh-lime rounded-r-xl p-5 sm:p-6"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss intro"
        className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full text-attooh-success hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ×
        </span>
      </button>

      <p className="font-lato font-bold text-[10px] uppercase tracking-[0.16em] text-attooh-success mb-1">
        Getting started
      </p>
      <h2
        id="intro-title"
        className="text-base sm:text-lg font-bold text-attooh-charcoal mb-3 pr-10"
      >
        How the Wealth FlightPlan™ works
      </h2>
      <ul className="space-y-2 text-sm text-attooh-charcoal">
        <li className="flex gap-2">
          <span aria-hidden="true" className="text-attooh-lime-hover font-bold">①</span>
          <span>
            Place yourself on one of 5 wealth stages with a 2-minute assessment.
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true" className="text-attooh-lime-hover font-bold">②</span>
          <span>
            Walk a 6-step framework with 13 live calculators and 7 worksheets.
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true" className="text-attooh-lime-hover font-bold">③</span>
          <span>
            Get personalised next steps that update as you submit each piece.
          </span>
        </li>
      </ul>
      <p className="text-xs text-attooh-muted mt-4">
        Everything autosaves. You can reset all your testing data from Profile any
        time.
      </p>
    </section>
  );
};
