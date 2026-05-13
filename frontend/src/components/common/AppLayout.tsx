import React from 'react';
import { TopNav } from './TopNav';

interface Props {
  children: React.ReactNode;
  // Common page widths so callers don't reinvent the container each time.
  // `compact` is for tight form flows (e.g. assessment one-question-at-a-time);
  // most pages should pick `narrow` / `default` / `wide`.
  maxWidth?: 'compact' | 'narrow' | 'default' | 'wide';
  className?: string;
  // Auth pages and a small handful of full-bleed flows opt out of the nav.
  // Default is on, so every protected page gets it automatically.
  showNav?: boolean;
}

const widthClass: Record<NonNullable<Props['maxWidth']>, string> = {
  compact: 'max-w-2xl',
  narrow: 'max-w-3xl',
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
};

// Single source of truth for the page chrome. Renders the sticky top nav
// (matching MOCKUP.html) followed by the `<main id="main">` element that
// protected pages render into. Pairs with the global skip link so keyboard
// users can jump past the nav to here.
export const AppLayout: React.FC<Props> = ({
  children,
  maxWidth = 'default',
  className = '',
  showNav = true,
}) => (
  <>
    {showNav && <TopNav />}
    <main
      id="main"
      tabIndex={-1}
      className={`${widthClass[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-10 ${className}`}
    >
      {children}
    </main>
  </>
);
