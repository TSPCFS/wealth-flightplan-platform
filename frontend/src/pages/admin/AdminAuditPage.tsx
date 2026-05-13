import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import type { AdminAuditLogResponse } from '../../types/admin.types';
import { AppLayout } from '../../components/common/AppLayout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FormError } from '../../components/common/FormError';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'success'
      ? 'bg-attooh-lime-pale text-attooh-success'
      : status === 'failure'
        ? 'bg-attooh-danger/10 text-attooh-danger'
        : 'bg-attooh-slate/10 text-attooh-slate';
  return (
    <span className={`font-lato font-bold text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded ${cls}`}>
      {status}
    </span>
  );
};

export const AdminAuditPage: React.FC = () => {
  useDocumentTitle('Admin · Audit log | Wealth FlightPlan™');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminAuditLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const debouncedAction = useDebouncedValue(actionFilter, 300);

  const filters = useMemo(
    () => ({
      action: debouncedAction.trim() || undefined,
      page,
      page_size: 50,
    }),
    [debouncedAction, page]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminService
      .audit(filters)
      .then((res) => !cancelled && setData(res))
      .catch((e) => !cancelled && setError((e as Error).message || 'Could not load audit log.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [debouncedAction]);

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
            Audit log
          </h1>
        </div>
        {data && (
          <p className="text-sm text-attooh-muted">
            {data.total} entr{data.total === 1 ? 'y' : 'ies'}
          </p>
        )}
      </header>

      <section className="bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-4">
        <input
          type="search"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action (e.g. admin.user.suspend)"
          className="w-full px-3 py-2 border-[1.5px] border-attooh-border rounded-md text-sm focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale"
        />
      </section>

      {error && <FormError error={error} />}
      {loading && !data && <LoadingSpinner />}

      {data && (
        <div className="bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-attooh-bg/60 text-xs uppercase font-lato tracking-[0.08em] text-attooh-slate">
              <tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Acting user</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-attooh-border">
              {data.entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-attooh-muted">
                    No matching entries.
                  </td>
                </tr>
              )}
              {data.entries.map((e) => (
                <tr key={e.log_id} className="hover:bg-attooh-bg/40 align-top">
                  <td className="px-4 py-3 text-attooh-muted whitespace-nowrap">
                    {formatDate(e.created_at)}
                  </td>
                  <td className="px-4 py-3 text-attooh-charcoal">
                    {e.user_id ? (
                      <Link
                        to={`/admin/users/${encodeURIComponent(e.user_id)}`}
                        className="text-attooh-lime-hover no-underline hover:text-attooh-charcoal font-mono text-xs"
                      >
                        {e.user_id.slice(0, 8)}…
                      </Link>
                    ) : (
                      <span className="text-attooh-muted">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-attooh-charcoal">
                    {e.action}
                  </td>
                  <td className="px-4 py-3 text-attooh-charcoal">
                    {e.entity_type === 'user' && e.entity_id ? (
                      <Link
                        to={`/admin/users/${encodeURIComponent(e.entity_id)}`}
                        className="text-attooh-lime-hover no-underline hover:text-attooh-charcoal font-mono text-xs"
                      >
                        user/{e.entity_id.slice(0, 8)}…
                      </Link>
                    ) : (
                      <span className="text-attooh-muted">{e.entity_type || '–'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={e.status} />
                    {e.error_message && (
                      <p className="text-xs text-attooh-danger mt-1">{e.error_message}</p>
                    )}
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
