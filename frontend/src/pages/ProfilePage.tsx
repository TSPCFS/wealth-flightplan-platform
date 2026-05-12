import React, { useEffect, useState } from 'react';
import { userService } from '../services/user.service';
import type { ProfileResponse } from '../types/api.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { ProfileForm } from '../components/user/ProfileForm';
import { Button } from '../components/common/Button';
import { formatShortDate } from '../utils/relativeTime';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="max-w-3xl mx-auto px-4 py-12">
        <FormError error={error} />
      </div>
    );
  }
  if (!profile) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
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
    </div>
  );
};
