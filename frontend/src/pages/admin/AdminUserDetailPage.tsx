import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import type { AdminUserDetail } from '../../types/admin.types';
import { AppLayout } from '../../components/common/AppLayout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FormError } from '../../components/common/FormError';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const formatDate = (iso: string | null): string => {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const Stat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="bg-attooh-card border border-attooh-border rounded-md px-4 py-3">
    <p className="font-lato font-bold text-[10px] uppercase tracking-[0.14em] text-attooh-slate mb-1">
      {label}
    </p>
    <p className="font-montserrat font-bold text-xl text-attooh-charcoal leading-none">
      {value}
    </p>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="font-lato font-bold text-[10px] uppercase tracking-[0.14em] text-attooh-slate mb-0.5">
      {label}
    </p>
    <p className="text-sm text-attooh-charcoal">{value || '–'}</p>
  </div>
);

export const AdminUserDetailPage: React.FC = () => {
  useDocumentTitle('Admin · User | Wealth FlightPlan™');
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const reload = React.useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const detail = await adminService.getUser(userId);
      setData(detail);
    } catch (e) {
      setError((e as Error).message || 'Could not load user.');
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isSelf = currentUser?.user_id === data?.user_id;

  const runAction = async (
    label: string,
    op: () => Promise<{ message: string }>
  ): Promise<void> => {
    setWorking(label);
    setError(null);
    setActionMessage(null);
    try {
      const res = await op();
      setActionMessage(res.message);
      await reload();
    } catch (e) {
      setError((e as Error).message || `Could not ${label}.`);
    } finally {
      setWorking(null);
    }
  };

  const handleDelete = async () => {
    if (!data || !userId) return;
    setWorking('delete');
    setError(null);
    try {
      await adminService.deleteUser(userId, confirmEmail);
      navigate('/admin/users', { replace: true });
    } catch (e) {
      setError((e as Error).message || 'Could not delete user.');
      setWorking(null);
    }
  };

  if (error && !data) {
    return (
      <AppLayout maxWidth="default" className="py-10">
        <FormError error={error} />
        <Link
          to="/admin/users"
          className="block text-center mt-4 font-lato font-bold text-xs uppercase tracking-[0.08em] text-attooh-lime-hover no-underline"
        >
          ← Users
        </Link>
      </AppLayout>
    );
  }
  if (!data) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="default" className="py-10 space-y-6">
      <header>
        <Link
          to="/admin/users"
          className="font-lato font-bold text-xs uppercase tracking-[0.08em] text-attooh-lime-hover no-underline"
        >
          ← Users
        </Link>
        <h1 className="font-montserrat font-bold text-3xl text-attooh-charcoal mt-1">
          {data.first_name} {data.last_name}
        </h1>
        <p className="text-attooh-muted">{data.email}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {data.suspended_at && (
            <span className="font-lato font-bold text-[10px] uppercase tracking-[0.14em] bg-attooh-danger/10 text-attooh-danger px-2 py-1 rounded">
              Suspended {formatDate(data.suspended_at)}
            </span>
          )}
          {data.is_admin && (
            <span className="font-lato font-bold text-[10px] uppercase tracking-[0.14em] bg-attooh-lime-pale text-attooh-success px-2 py-1 rounded">
              Admin
            </span>
          )}
          {!data.email_verified && (
            <span className="font-lato font-bold text-[10px] uppercase tracking-[0.14em] bg-attooh-warn/15 text-[#9C7611] px-2 py-1 rounded">
              Unverified email
            </span>
          )}
          {isSelf && (
            <span className="font-lato font-bold text-[10px] uppercase tracking-[0.14em] bg-attooh-slate/10 text-attooh-slate px-2 py-1 rounded">
              You
            </span>
          )}
        </div>
      </header>

      {error && <FormError error={error} />}
      {actionMessage && (
        <div className="bg-attooh-lime-pale border-l-4 border-attooh-lime rounded-r px-4 py-3 text-sm text-attooh-charcoal">
          {actionMessage}
        </div>
      )}

      <section className="bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-6 space-y-4">
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate inline-block pb-1.5 border-b-[3px] border-attooh-lime">
          Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {data.suspended_at ? (
            <Button
              variant="primary"
              size="sm"
              disabled={working !== null}
              onClick={() => runAction('unsuspend', () => adminService.unsuspend(data.user_id))}
            >
              Unsuspend
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={working !== null || isSelf}
              onClick={() => runAction('suspend', () => adminService.suspend(data.user_id))}
            >
              Suspend
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={working !== null}
            onClick={() => runAction('reset password', () => adminService.resetPassword(data.user_id))}
          >
            Reset password
          </Button>
          {data.is_admin ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={working !== null || isSelf}
              onClick={() => runAction('demote', () => adminService.demote(data.user_id))}
            >
              Demote from admin
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={working !== null}
              onClick={() => runAction('promote', () => adminService.promote(data.user_id))}
            >
              Promote to admin
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            disabled={working !== null || isSelf}
            onClick={() => setDeleteOpen(true)}
          >
            Delete user…
          </Button>
        </div>
        {isSelf && (
          <p className="text-xs text-attooh-muted">
            You can't suspend, demote, or delete your own account. Ask another admin.
          </p>
        )}
      </section>

      <section className="bg-attooh-card border border-attooh-border rounded-lg shadow-attooh-sm p-6 space-y-4">
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate inline-block pb-1.5 border-b-[3px] border-attooh-lime">
          Profile
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Subscription" value={data.subscription_tier} />
          <Field label="Account status" value={data.account_status} />
          <Field label="Current stage" value={data.current_stage ?? '–'} />
          <Field
            label="Household income (after tax)"
            value={
              data.household_income_monthly_after_tax !== null
                ? `R ${data.household_income_monthly_after_tax.toLocaleString()}`
                : '–'
            }
          />
          <Field label="Household size" value={data.household_size ?? '–'} />
          <Field label="Dependants" value={data.number_of_dependants ?? '–'} />
          <Field label="Language" value={data.primary_language ?? '–'} />
          <Field label="Timezone" value={data.timezone ?? '–'} />
          <Field label="Created" value={formatDate(data.created_at)} />
          <Field label="Email verified at" value={formatDate(data.email_verified_at)} />
          <Field label="Last login" value={formatDate(data.last_login)} />
          <Field label="Business owner" value={data.is_business_owner ? 'Yes' : 'No'} />
        </div>
      </section>

      <section>
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate inline-block pb-1.5 border-b-[3px] border-attooh-lime mb-3">
          Activity counts
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Stat label="Assessments" value={data.counts.assessments} />
          <Stat label="Worksheet submits" value={data.counts.worksheet_submissions} />
          <Stat label="Drafts" value={data.counts.worksheet_drafts} />
          <Stat label="Example runs" value={data.counts.example_interactions} />
          <Stat label="Chatbot convs" value={data.counts.chatbot_conversations} />
          <Stat label="Leads" value={data.counts.chatbot_leads} />
          <Stat label="Steps complete" value={data.counts.framework_steps_completed} />
        </div>
      </section>

      {deleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !working && setDeleteOpen(false)}
        >
          <div
            className="bg-attooh-card rounded-2xl shadow-attooh-md p-6 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-montserrat font-bold text-xl text-attooh-charcoal">
              Permanently delete {data.email}?
            </h3>
            <p className="text-sm text-attooh-muted">
              This removes the user row and cascades through assessments,
              worksheet submissions, example interactions, framework progress,
              and chatbot conversations. POPIA-compliant erasure. Cannot be undone.
            </p>
            <label className="block">
              <span className="font-lato font-bold text-[10px] uppercase tracking-[0.14em] text-attooh-slate">
                Type the user's email to confirm
              </span>
              <input
                type="text"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={data.email}
                className="mt-1 w-full px-3 py-2 border-[1.5px] border-attooh-border rounded-md text-sm focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={working !== null}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={working !== null || confirmEmail.trim().toLowerCase() !== data.email.toLowerCase()}
                onClick={handleDelete}
              >
                {working === 'delete' ? 'Deleting…' : 'Permanently delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
