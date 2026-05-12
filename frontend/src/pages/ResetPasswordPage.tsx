import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { FormError } from '../components/common/FormError';
import { AuthLayout } from '../components/common/AuthLayout';

const resetPasswordSchema = z.object({
  new_password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirmPasswordReset } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setSubmitError('Reset token is missing');
      return;
    }
    setIsLoading(true);
    setSubmitError(null);
    try {
      await confirmPasswordReset({ token, new_password: data.new_password });
      setShowSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <AuthLayout title="Password reset">
        <div role="status" className="rounded-md bg-green-50 p-4 text-center">
          <div className="text-sm text-green-700">Password reset successfully!</div>
        </div>
        <Button onClick={() => navigate('/login')} className="mt-4 w-full">
          Go to Login
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your new password below.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormError error={submitError || undefined} />

        <Input
          label="New Password"
          type="password"
          {...register('new_password')}
          error={errors.new_password?.message}
        />

        <Input
          label="Confirm New Password"
          type="password"
          {...register('confirm_password')}
          error={errors.confirm_password?.message}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Button>

        <div className="text-center">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
