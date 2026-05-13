import React from 'react';

interface Props {
  children: React.ReactNode;
  // Common page widths so callers don't reinvent the container each time.
  maxWidth?: 'narrow' | 'default' | 'wide';
  className?: string;
}

const widthClass: Record<NonNullable<Props['maxWidth']>, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
};

// Single source of truth for the `<main id="main">` element that protected
// pages render into. Pairs with the global skip link so keyboard users can
// jump straight here. Pages still own their inner content and spacing.
export const AppLayout: React.FC<Props> = ({
  children,
  maxWidth = 'default',
  className = '',
}) => (
  <main
    id="main"
    tabIndex={-1}
    className={`${widthClass[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-10 ${className}`}
  >
    {children}
  </main>
);
