import React from 'react';

interface Props {
  children: React.ReactNode;
  // Drop the lime underline when the label is decorative inline (e.g. inside
  // a card header alongside another control).
  underline?: boolean;
  className?: string;
}

// Lato uppercase eyebrow used to mark every major section across the app.
// Default treatment matches MOCKUP.html: 11px, letter-spacing 0.16em,
// slate text with a 3px lime underline. Single source of truth so the
// typography stays consistent everywhere it appears.
export const SectionLabel: React.FC<Props> = ({
  children,
  underline = true,
  className = '',
}) => (
  <span
    className={[
      'inline-block font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate',
      underline ? 'pb-1.5 border-b-[3px] border-attooh-lime' : '',
      className,
    ].join(' ')}
  >
    {children}
  </span>
);
