import React, { useEffect, useState } from 'react';
import { userService } from '../services/user.service';
import type { ProfileResponse } from '../types/api.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { ProfileForm } from '../components/user/ProfileForm';
import { Button } from '../components/common/Button';
import { formatShortDate } from '../utils/relativeTime';
import { ResetProgressModal } from '../components/user/ResetProgressModal';
import { AppLayout } from '../components/common/AppLayout';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ProfilePage: React.FC = () => {
  useDocumentTitle('Profile');
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    userService
      .getProfile()
      .then((p) => !cancelled && setProfile(p))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load profile.'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error} />
      </AppLayout>
    );
  }
  if (!profile) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="narrow" className="space-y-7">
      <header>
        <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
          Profile
        </h1>
        <p className="text-attooh-muted mt-1.5">
          Personal details and preferences. Your household data feeds calculations across the
          platform.
        </p>
      </header>

      <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-4">
          Personal details
        </h2>
        <ProfileForm profile={profile} onSaved={setProfile} />
      </section>

      <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7 space-y-3">
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate">
          Account
        </h2>
        <div>
          <p className="font-lato text-[10px] font-bold uppercase tracking-[0.14em] text-attooh-muted">Email</p>
          <p className="text-sm text-attooh-charcoal">{profile.email}</p>
          <p className="text-xs text-attooh-muted mt-1">
            Contact support to change your email address.
          </p>
        </div>
        <div>
          <p className="font-lato text-[10px] font-bold uppercase tracking-[0.14em] text-attooh-muted">Member since</p>
          <p className="text-sm text-attooh-charcoal">{formatShortDate(profile.created_at)}</p>
        </div>
      </section>

      <section
        aria-labelledby="reset-section-title"
        className="bg-attooh-card rounded-xl border-[1.5px] border-[rgba(199,54,59,0.25)] shadow-attooh-sm p-7"
      >
        <h2
          id="reset-section-title"
          className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-danger mb-2"
        >
          Reset my testing data
        </h2>
        <p className="text-sm text-attooh-charcoal mb-4">
          Wipes your assessments, worksheets, and progress so you can re-run the
          recommendation cascade from a clean state. Your account, profile, and
          password are kept.
        </p>
        <Button
          type="button"
          variant="danger"
          onClick={() => setResetOpen(true)}
          aria-label="Open reset progress confirmation"
        >
          Reset progress
        </Button>
      </section>

      <ResetProgressModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      />

      <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
        <h2 className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-3">
          Privacy
        </h2>
        <p className="text-sm text-attooh-muted mb-4">
          Data download and account deletion arrive in Phase 6.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled
            title="Available in Phase 6"
            aria-label="Download my data (coming in Phase 6)"
          >
            Download my data
          </Button>
          <Button
            variant="danger"
            disabled
            title="Available in Phase 6"
            aria-label="Delete my account (coming in Phase 6)"
          >
            Delete my account
          </Button>
        </div>
      </section>
    </AppLayout>
  );
};
