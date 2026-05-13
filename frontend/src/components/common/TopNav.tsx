import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// Six primary destinations, matching MOCKUP.html. Sentence case, in the
// canonical order: Dashboard, Framework, Assessments, Worksheets,
// Examples, Case Studies.
const NAV_LINKS: { to: string; label: string }[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/framework', label: 'Framework' },
  { to: '/assessments', label: 'Assessments' },
  { to: '/worksheets', label: 'Worksheets' },
  { to: '/examples', label: 'Examples' },
  { to: '/case-studies', label: 'Case studies' },
];

// Derive two-letter initials for the avatar button. Falls back to the
// first two characters of the email's local-part if the name is missing,
// then to a stoic "WF".
const initialsFrom = (
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined
): string => {
  const f = (firstName ?? '').trim();
  const l = (lastName ?? '').trim();
  if (f || l) return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase() || 'WF';
  const local = (email ?? '').split('@')[0];
  return (local.slice(0, 2) || 'WF').toUpperCase();
};

export const TopNav: React.FC = () => {
  // Use the context directly (not the throwing `useAuth` hook) so the nav
  // renders cleanly in test harnesses that don't provide an AuthProvider.
  // In production, this is always populated by AuthProvider at the root.
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const logout = auth?.logout;
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the avatar menu on outside click or Escape, so it behaves like
  // every other popover the user has met.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    if (logout) await logout();
    navigate('/login');
  };

  const initials = initialsFrom(user?.first_name, user?.last_name, user?.email);

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-40 bg-attooh-card border-b border-attooh-border shadow-attooh-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-9 h-[72px]">
        {/* Brand: lime circle with white diamond cutout + wordmark */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 no-underline text-attooh-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime rounded"
          aria-label="Wealth FlightPlan home"
        >
          <span
            aria-hidden="true"
            className="relative inline-block w-8 h-8 rounded-full bg-attooh-lime flex-shrink-0"
          >
            <span
              className="absolute inset-2 bg-attooh-card"
              style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
            />
          </span>
          <span className="font-montserrat font-bold text-[18px] leading-none tracking-tight">
            Wealth FlightPlan
            <span className="text-attooh-lime">™</span>
          </span>
        </Link>

        {/* Nav links: 28px gap, active = lime + lime underline */}
        <div className="hidden md:flex items-center gap-7 ml-auto mr-7">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/dashboard'}
              className={({ isActive }) =>
                [
                  'relative font-montserrat text-[14px] no-underline transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime rounded',
                  isActive
                    ? 'text-attooh-lime-hover font-medium after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-2 after:h-0.5 after:bg-attooh-lime after:rounded'
                    : 'text-attooh-charcoal hover:text-attooh-lime-hover font-normal',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Avatar + menu */}
        <div className="relative ml-auto md:ml-0" ref={menuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-[34px] h-[34px] rounded-full bg-attooh-lime text-attooh-charcoal grid place-items-center font-bold text-[13px] cursor-pointer transition-shadow hover:shadow-[0_0_0_3px_var(--attooh-lime-pale)] focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime focus-visible:ring-offset-2"
          >
            {initials}
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 rounded-lg bg-attooh-card border border-attooh-border shadow-attooh-md py-2"
            >
              <div className="px-4 py-2 border-b border-attooh-border">
                <p className="text-sm font-medium text-attooh-charcoal truncate">
                  {user?.first_name || user?.last_name
                    ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
                    : 'Signed in'}
                </p>
                <p className="text-xs text-attooh-muted truncate">{user?.email}</p>
              </div>
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-attooh-charcoal hover:bg-attooh-lime-pale no-underline"
              >
                Profile
              </Link>
              {user?.is_admin && (
                <Link
                  to="/admin"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-attooh-charcoal hover:bg-attooh-lime-pale no-underline"
                >
                  Admin
                  <span className="ml-2 inline-block text-[10px] font-bold uppercase tracking-wider text-attooh-lime-hover">
                    admin
                  </span>
                </Link>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-attooh-charcoal hover:bg-attooh-lime-pale"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
