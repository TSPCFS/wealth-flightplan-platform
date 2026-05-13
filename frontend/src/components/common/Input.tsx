import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id: providedId, ...props }, ref) => {
    // Generate a stable id when none is provided so the label/htmlFor pair
    // associates correctly for screen readers and getByLabelText queries.
    const reactId = useId();
    const inputId = providedId ?? `field-${reactId}`;
    const errorId = error ? `${inputId}-error` : undefined;

    const baseClasses =
      'block w-full px-3.5 py-2.5 border-[1.5px] border-attooh-border rounded-lg bg-white text-attooh-charcoal placeholder-attooh-muted text-sm transition ' +
      'focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale ' +
      'focus-visible:border-attooh-lime focus-visible:ring-[3px] focus-visible:ring-attooh-lime-pale';
    const errorClasses = error
      ? 'border-attooh-danger text-attooh-danger placeholder-attooh-danger focus:border-attooh-danger focus:ring-[rgba(199,54,59,0.15)]'
      : '';
    const classes = `${baseClasses} ${errorClasses} ${className}`;

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block font-lato font-bold text-[11px] uppercase tracking-[0.1em] text-attooh-slate mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={classes}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-attooh-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
