import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

// attooh!-branded auth chrome. Bare paper-tone canvas, no top nav, with
// the lime-circle brand mark above the heading so the unauthenticated
// pages still feel on-brand. The card sits in a fixed narrow column
// regardless of viewport.
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-attooh-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center gap-3 mb-8">
          <span
            aria-hidden="true"
            className="relative inline-block w-12 h-12 rounded-full bg-attooh-lime"
          >
            <span
              className="absolute inset-3 bg-attooh-bg"
              style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
            />
          </span>
          <div className="text-center">
            <p className="font-montserrat font-bold text-base text-attooh-charcoal tracking-tight">
              Wealth FlightPlan
              <span className="text-attooh-lime">™</span>
            </p>
          </div>
        </div>
        <div className="bg-attooh-card border border-attooh-border rounded-2xl shadow-attooh-md p-8 sm:p-10">
          <div className="text-center mb-6">
            <h2 className="font-montserrat text-2xl font-bold text-attooh-charcoal tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm text-attooh-muted">{subtitle}</p>
            )}
          </div>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
};
