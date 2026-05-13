import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import type {
  AdminLeadItem,
  AdminLeadStatus,
  AdminLeadsResponse,
} from '../../types/admin.types';
import { AppLayout } from '../../components/common/AppLayout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FormError } from '../../components/common/FormError';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const STATUS_LABELS: Record<AdminLeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  closed: 'Closed',
};

const STATUS_FILTERS: { key: AdminLeadStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'closed', label: 'Closed' },
];

const TRIGGER_LABELS: Record<string, string> = {
  worksheet_complete: 'Worksheet complete',
  calculator_complete: 'Calculator complete',
  regulated_question: 'Regulated question',
  user_request: 'User request',
  step_complete: 'Step complete',
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

export const AdminLeadsPage: React.FC = () => {
  useDocumentTitle('Admin · Leads | Wealth FlightPlan™');
  const [status, setStatus] = useState<AdminLeadStatus | 'all'>('all');
  const [data, setData] = useState<AdminLeadsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listLeads({
        status: status === 'all' ? undefined : status,
      });
      setData(res);
    } catch (e) {
      setError((e as Error).message || 'Could not load leads.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusChange = async (lead: AdminLeadItem, next: AdminLeadStatus) => {
    if (next === lead.status) return;
    setUpdatingId(lead.lead_id);
    try {
      await adminService.updateLeadStatus(lead.lead_id, next);
      await load();
    } catch (e) {
      setError((e as Error).message || 'Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

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
            Leads
          </h1>
          <p className="text-sm text-attooh-muted">
            Advisor-handoff requests captured by the chatbot. Mailed to wouter@attooh.co.za.
          </p>
        </div>
        {data && (
          <p className="text-sm text-attooh-muted">
            {data.total} lead{data.total === 1 ? '' : 's'}
          </p>
        )}
      </header>

      <section className="bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-4">
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

      {data && data.leads.length === 0 && (
        <p className="text-center text-attooh-muted py-8">
          No leads {status === 'all' ? 'yet' : `with status "${STATUS_LABELS[status as AdminLeadStatus]}"`}.
        </p>
      )}

      {data && data.leads.length > 0 && (
        <div className="space-y-3">
          {data.leads.map((lead) => (
            <article
              key={lead.lead_id}
              className="bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-montserrat font-bold text-base text-attooh-charcoal">
                    {lead.user_name}{' '}
                    <span className="text-attooh-muted font-normal">
                      · {lead.user_email}
                    </span>
                  </p>
                  <p className="text-xs text-attooh-muted mt-0.5">
                    {TRIGGER_LABELS[lead.trigger_event] ?? lead.trigger_event} ·{' '}
                    {formatDate(lead.created_at)}
                  </p>
                </div>
                <select
                  value={lead.status}
                  disabled={updatingId === lead.lead_id}
                  onChange={(e) =>
                    handleStatusChange(lead, e.target.value as AdminLeadStatus)
                  }
                  className="text-sm px-3 py-1.5 border-[1.5px] border-attooh-border rounded-md bg-attooh-card focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale"
                >
                  {(Object.keys(STATUS_LABELS) as AdminLeadStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              {lead.topic && (
                <p className="text-sm text-attooh-charcoal mt-3">
                  <strong>Topic:</strong> {lead.topic}
                </p>
              )}
              {lead.message && (
                <pre className="text-sm text-attooh-muted whitespace-pre-wrap mt-2 font-montserrat">
                  {lead.message}
                </pre>
              )}
              {lead.contacted_at && (
                <p className="text-xs text-attooh-muted mt-3">
                  First contacted {formatDate(lead.contacted_at)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
};
