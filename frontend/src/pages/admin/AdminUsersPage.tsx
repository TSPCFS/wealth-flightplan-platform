import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import type { AdminUserListItem, AdminUserListResponse } from '../../types/admin.types';
import { AppLayout } from '../../components/common/AppLayout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FormError } from '../../components/common/FormError';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'admin', label: 'Admins' },
  { key: 'verified', label: 'Verified' },
  { key: 'suspended', label: 'Suspended' },
] as const;

type StatusKey = (typeof STATUS_FILTERS)[number]['key'];

const formatDate = (iso: string | null): string => {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const RoleBadge: React.FC<{ user: AdminUserListItem }> = ({ user }) => {
  if (user.suspended_at) {
    return (
      <span className="font-lato font-bold text-[9px] uppercase tracking-[0.14em] bg-attooh-danger/10 text-attooh-danger px-2 py-0.5 rounded">
        Suspended
      </span>
    );
  }
  if (user.is_admin) {
    return (
      <span className="font-lato font-bold text-[9px] uppercase tracking-[0.14em] bg-attooh-lime-pale text-attooh-success px-2 py-0.5 rounded">
        Admin
      </span>
    );
  }
  if (!user.email_verified) {
    return (
      <span className="font-lato font-bold text-[9px] uppercase tracking-[0.14em] bg-attooh-warn/15 text-[#9C7611] px-2 py-0.5 rounded">
        Unverified
      </span>
    );
  }
  return (
    <span className="font-lato font-bold text-[9px] uppercase tracking-[0.14em] bg-attooh-slate/10 text-attooh-slate px-2 py-0.5 rounded">
      User
    </span>
  );
};

export const AdminUsersPage: React.FC = () => {
  useDocumentTitle('Admin · Users | Wealth FlightPlan™');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusKey>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQ = useDebouncedValue(q, 300);

  const filters = useMemo(
    () => ({
      q: debouncedQ.trim() || undefined,
      is_admin: status === 'admin' ? true : undefined,
      verified: status === 'verified' ? true : undefined,
      suspended: status === 'suspended' ? true : undefined,
      page,
      page_size: 25,
    }),
    [debouncedQ, status, page]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminService
      .listUsers(filters)
      .then((res) => !cancelled && setData(res))
      .catch((e) => !cancelled && setError((e as Error).message || 'Could not load users.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters]);

  // Reset to page 1 whenever the filter inputs change.
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status]);

  return (
    <AppLayout maxWidth="wide" className="py-10 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Link
            to="/admin"
            className="font-lato font-bold text-xs uppercase tracking-[0.08em] text-attooh-lime-hover no-underline"
          >
            ← Admin
          </Link>
          <h1 className="font-montserrat font-bold text-3xl text-attooh-charcoal mt-1">
            Users
          </h1>
        </div>
        {data && (
          <p className="text-sm text-attooh-muted">
            {data.total} user{data.total === 1 ? '' : 's'}
            {data.has_more && ' · paging'}
          </p>
        )}
      </header>

      <section className="bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-4 space-y-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, first name, last name"
          className="w-full px-3 py-2 border-[1.5px] border-attooh-border rounded-md text-sm focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale"
        />
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              className={[
                'font-lato text-xs font-bold uppercase tracking-[0.08em] px-3 py-1.5 rounded-full transition',
                status === f.key
                  ? 'bg-attooh-lime text-attooh-charcoal'
                  : 'bg-attooh-card text-attooh-slate ring-1 ring-attooh-border hover:bg-attooh-lime-pale',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {error && <FormError error={error} />}
      {loading && !data && <LoadingSpinner />}

      {data && (
        <div className="bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-attooh-bg/60 text-xs uppercase font-lato tracking-[0.08em] text-attooh-slate">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Last login</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-attooh-border">
              {data.users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-attooh-muted">
                    No users match the filters.
                  </td>
                </tr>
              )}
              {data.users.map((u) => (
                <tr key={u.user_id} className="hover:bg-attooh-bg/40">
                  <td className="px-4 py-3 align-top text-attooh-charcoal">
                    <Link
                      to={`/admin/users/${encodeURIComponent(u.user_id)}`}
                      className="text-attooh-lime-hover no-underline hover:text-attooh-charcoal"
                    >
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top text-attooh-charcoal">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <RoleBadge user={u} />
                  </td>
                  <td className="px-4 py-3 align-top text-attooh-muted">
                    {formatDate(u.last_login)}
                  </td>
                  <td className="px-4 py-3 align-top text-attooh-muted">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Link
                      to={`/admin/users/${encodeURIComponent(u.user_id)}`}
                      className="font-lato font-bold text-xs uppercase tracking-[0.08em] text-attooh-lime-hover no-underline"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (data.has_more || data.page > 1) && (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          <button
            type="button"
            disabled={data.page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="font-lato font-bold text-xs uppercase tracking-[0.08em] px-4 py-2 rounded-full border-[1.5px] border-attooh-border bg-attooh-card text-attooh-slate disabled:opacity-50"
          >
            ← Previous
          </button>
          <p className="text-sm text-attooh-muted">
            Page <strong>{data.page}</strong>
          </p>
          <button
            type="button"
            disabled={!data.has_more || loading}
            onClick={() => setPage((p) => p + 1)}
            className="font-lato font-bold text-xs uppercase tracking-[0.08em] px-4 py-2 rounded-full border-[1.5px] border-attooh-border bg-attooh-card text-attooh-slate disabled:opacity-50"
          >
            Next →
          </button>
        </nav>
      )}
    </AppLayout>
  );
};
