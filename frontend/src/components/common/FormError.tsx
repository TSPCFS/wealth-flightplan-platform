import React from 'react';

interface FormErrorProps {
  error?: string;
}

// Inline error banner. attooh!-branded: the danger ramp uses a softened
// red-tinged background with the brand danger token for the text so it
// reads urgent without screaming.
export const FormError: React.FC<FormErrorProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="rounded-r-lg bg-[rgba(199,54,59,0.08)] border-l-4 border-attooh-danger p-4">
      <div className="text-sm text-attooh-charcoal">{error}</div>
    </div>
  );
};
