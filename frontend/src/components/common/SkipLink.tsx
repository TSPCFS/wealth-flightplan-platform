import React from 'react';

// Visible only on focus, jumps the user's keyboard focus to the page's
// <main id="main"> element. Mounted once near the top of every protected
// route from inside the ProtectedRoute wrapper.
export const SkipLink: React.FC = () => (
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:rounded focus:px-3 focus:py-2 focus:shadow"
  >
    Skip to main content
  </a>
);
