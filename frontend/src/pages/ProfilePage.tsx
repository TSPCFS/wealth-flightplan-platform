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
    <AppLayout maxWidth="narrow" className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Profile</h1>
        <p className="text-gray-600 mt-1">
          Personal details and preferences. Your household data feeds calculations across the
          platform.
        </p>
      </header>

      <section className="bg-white rounded-lg shadow p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
          Personal details
        </h2>
        <ProfileForm profile={profile} onSaved={setProfile} />
      </section>

      <section className="bg-white rounded-lg shadow p-5 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Account
        </h2>
        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="text-sm text-gray-900">{profile.email}</p>
          <p className="text-xs text-gray-500 mt-1">
            Contact support to change your email address.
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Member since</p>
          <p className="text-sm text-gray-900">{formatShortDate(profile.created_at)}</p>
        </div>
      </section>

      <section
        aria-labelledby="reset-section-title"
        className="bg-white rounded-lg shadow p-5 ring-1 ring-red-100"
      >
        <h2
          id="reset-section-title"
          className="text-sm font-semibold uppercase tracking-wide text-red-700 mb-2"
        >
          Reset my testing data
        </h2>
        <p className="text-sm text-gray-700 mb-4">
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

      <section className="bg-white rounded-lg shadow p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Privacy
        </h2>
        <p className="text-sm text-gray-600 mb-3">
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
