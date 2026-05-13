import React from 'react';

// Visible only on focus, jumps the user's keyboard focus to the page's
// <main id="main"> element. Mounted once near the top of every protected
// route from inside the ProtectedRoute wrapper. attooh!-branded focus
// ring matches the global lime treatment.
export const SkipLink: React.FC = () => (
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-attooh-card focus:text-attooh-charcoal focus:ring-2 focus:ring-attooh-lime focus:rounded focus:px-3 focus:py-2 focus:shadow-attooh-md focus:font-semibold"
  >
    Skip to main content
  </a>
);
