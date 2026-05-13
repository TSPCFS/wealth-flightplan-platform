import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ProfileResponse } from '../../types/api.types';
import type { ProfilePatch } from '../../types/user.types';
import { userService } from '../../services/user.service';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { Input } from '../common/Input';

const optionalNonNegInt = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    if (typeof v === 'number' && Number.isNaN(v)) return undefined;
    return v;
  },
  z.number({ invalid_type_error: 'Must be a number' }).int('Whole number').min(0, 'Must be ≥ 0').optional()
);

const optionalNonNegMoney = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    if (typeof v === 'number' && Number.isNaN(v)) return undefined;
    return v;
  },
  z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be ≥ 0').optional()
);

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'Too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Too long'),
  household_income_monthly_after_tax: optionalNonNegMoney,
  household_size: optionalNonNegInt,
  number_of_dependants: optionalNonNegInt,
  is_business_owner: z.boolean(),
  primary_language: z.enum(['en']),
  timezone: z.enum(['SAST']),
});

type FormData = z.infer<typeof profileSchema>;

interface Props {
  profile: ProfileResponse;
  onSaved: (next: ProfileResponse) => void;
}

export const ProfileForm: React.FC<Props> = ({ profile, onSaved }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      household_income_monthly_after_tax: profile.household_income_monthly_after_tax ?? undefined,
      household_size: profile.household_size ?? undefined,
      number_of_dependants: profile.number_of_dependants ?? undefined,
      is_business_owner: profile.is_business_owner ?? false,
      primary_language: (profile.primary_language as 'en') ?? 'en',
      timezone: (profile.timezone as 'SAST') ?? 'SAST',
    },
  });

  // Hide the "Saved" toast after 3 seconds so it doesn't loiter.
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const patch: ProfilePatch = { ...data };
    try {
      const next = await userService.updateProfile(patch);
      onSaved(next);
      setSavedAt(new Date());
      reset(data); // mark form as clean again
    } catch (err) {
      const apiErr = err as { code?: string; message?: string };
      setSubmitError(apiErr?.message || 'Could not save profile.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" aria-label="Profile">
      <FormError error={submitError || undefined} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First name"
          {...register('first_name')}
          error={errors.first_name?.message}
        />
        <Input
          label="Last name"
          {...register('last_name')}
          error={errors.last_name?.message}
        />
      </div>

      <Input
        label="Monthly household income (after tax, R)"
        type="number"
        {...register('household_income_monthly_after_tax', { valueAsNumber: true })}
        error={errors.household_income_monthly_after_tax?.message}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Household size"
          type="number"
          {...register('household_size', { valueAsNumber: true })}
          error={errors.household_size?.message}
        />
        <Input
          label="Number of dependants"
          type="number"
          {...register('number_of_dependants', { valueAsNumber: true })}
          error={errors.number_of_dependants?.message}
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          {...register('is_business_owner')}
          className="h-4 w-4 rounded border-attooh-border text-attooh-lime focus:ring-attooh-lime"
        />
        <span className="text-sm text-attooh-charcoal">
          I'm a business owner (unlocks Step 4b in your progress)
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="font-lato font-bold text-[11px] uppercase tracking-[0.1em] text-attooh-slate">
            Primary language
          </span>
          <select
            {...register('primary_language')}
            className="mt-1.5 block w-full px-3.5 py-2.5 border-[1.5px] border-attooh-border rounded-lg text-sm text-attooh-charcoal bg-white transition focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale"
          >
            <option value="en">English</option>
          </select>
        </label>
        <label className="block">
          <span className="font-lato font-bold text-[11px] uppercase tracking-[0.1em] text-attooh-slate">
            Timezone
          </span>
          <select
            {...register('timezone')}
            className="mt-1.5 block w-full px-3.5 py-2.5 border-[1.5px] border-attooh-border rounded-lg text-sm text-attooh-charcoal bg-white transition focus:outline-none focus:border-attooh-lime focus:ring-[3px] focus:ring-attooh-lime-pale"
          >
            <option value="SAST">SAST (GMT+2)</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
        {savedAt && (
          <span
            role="status"
            data-testid="profile-saved-toast"
            className="text-sm font-medium text-attooh-success"
          >
            Saved
          </span>
        )}
      </div>
    </form>
  );
};
