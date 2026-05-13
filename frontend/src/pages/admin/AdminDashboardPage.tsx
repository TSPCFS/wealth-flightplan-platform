import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import type { AdminStats } from '../../types/admin.types';
import { AppLayout } from '../../components/common/AppLayout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FormError } from '../../components/common/FormError';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const StatTile: React.FC<{ label: string; value: number | string; helper?: string }> = ({
  label,
  value,
  helper,
}) => (
  <div className="bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-5">
    <p className="font-lato font-bold text-[10px] uppercase tracking-[0.16em] text-attooh-slate mb-1.5">
      {label}
    </p>
    <p className="font-montserrat font-bold text-3xl text-attooh-lime-hover leading-none">
      {value}
    </p>
    {helper && <p className="text-xs text-attooh-muted mt-1.5">{helper}</p>}
  </div>
);

export const AdminDashboardPage: React.FC = () => {
  useDocumentTitle('Admin | Wealth FlightPlan™');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminService
      .stats()
      .then((s) => !cancelled && setStats(s))
      .catch((e) => !cancelled && setError((e as Error).message || 'Could not load stats.'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <AppLayout maxWidth="wide" className="py-10">
        <FormError error={error} />
      </AppLayout>
    );
  }
  if (!stats) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="wide" className="py-10 space-y-8">
      <header>
        <h1 className="font-montserrat font-bold text-3xl text-attooh-charcoal mb-1">
          Admin
        </h1>
        <p className="text-attooh-muted">
          Manage users, leads, and audit activity. Bootstrap admin is{' '}
          <strong>wouter@attooh.co.za</strong>.
        </p>
      </header>

      <section>
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate inline-block pb-1.5 border-b-[3px] border-attooh-lime mb-4">
          Snapshot
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatTile label="Total users" value={stats.total_users} />
          <StatTile label="Verified" value={stats.verified_users} />
          <StatTile label="Suspended" value={stats.suspended_users} />
          <StatTile label="Admins" value={stats.admins} />
          <StatTile label="New (7d)" value={stats.new_signups_7d} />
          <StatTile label="New (30d)" value={stats.new_signups_30d} />
        </div>
      </section>

      <section>
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate inline-block pb-1.5 border-b-[3px] border-attooh-lime mb-4">
          Quick links
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/users"
            className="block bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-5 hover:border-attooh-lime hover:-translate-y-0.5 transition no-underline"
          >
            <p className="font-montserrat font-bold text-base text-attooh-charcoal mb-1">
              Users →
            </p>
            <p className="text-sm text-attooh-muted">
              Search, suspend, promote, reset password, or delete an account.
            </p>
          </Link>
          <Link
            to="/admin/leads"
            className="block bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-5 hover:border-attooh-lime hover:-translate-y-0.5 transition no-underline"
          >
            <p className="font-montserrat font-bold text-base text-attooh-charcoal mb-1">
              Leads →
            </p>
            <p className="text-sm text-attooh-muted">
              Inbox of advisor-handoff requests captured by the chatbot.
            </p>
          </Link>
          <Link
            to="/admin/audit"
            className="block bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-5 hover:border-attooh-lime hover:-translate-y-0.5 transition no-underline"
          >
            <p className="font-montserrat font-bold text-base text-attooh-charcoal mb-1">
              Audit log →
            </p>
            <p className="text-sm text-attooh-muted">
              Every state-changing admin + auth event, newest first.
            </p>
          </Link>
        </div>
      </section>
    </AppLayout>
  );
};
