import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // primary  = lime pill, charcoal text (the canonical CTA)
  // secondary = white pill with thin border, slate text (companion to primary)
  // ghost    = transparent pill with white border (for dark backgrounds, e.g. the hero)
  // danger   = retained for destructive actions (Profile reset etc.)
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  // Base: pill shape, Montserrat 600, anti-aliased focus ring.
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-full font-montserrat font-semibold tracking-tight transition-all ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-attooh-lime ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-attooh-lime ' +
    'disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-attooh-lime text-attooh-charcoal hover:bg-attooh-lime-hover hover:text-white',
    secondary:
      'bg-white text-attooh-slate border-[1.5px] border-attooh-border hover:border-attooh-lime hover:text-attooh-charcoal',
    ghost:
      'bg-transparent text-white border-[1.5px] border-white/40 hover:border-attooh-lime hover:text-attooh-lime',
    danger:
      'bg-attooh-danger text-white hover:opacity-90',
  };

  const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'px-[18px] py-2 text-[13px]',
    md: 'px-6 py-3 text-sm',
    lg: 'px-7 py-3 text-base',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
