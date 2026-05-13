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
      'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 ' +
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ' +
      'focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm';
    const errorClasses = error
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
      : '';
    const classes = `${baseClasses} ${errorClasses} ${className}`;

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
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
          <p id={errorId} className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
