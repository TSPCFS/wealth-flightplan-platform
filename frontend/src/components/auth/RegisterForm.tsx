import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { FormError } from '../common/FormError';

// Empty <input type="number"> registered with valueAsNumber gives NaN; coerce to undefined.
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
  z.number().optional()
);

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  household_income_monthly_after_tax: optionalNumber,
  household_size: z.preprocess(
    (v) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
    z.number().min(1).optional()
  ),
  number_of_dependants: z.preprocess(
    (v) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
    z.number().min(0).optional()
  ),
}).refine((data) => data.password !== data.email, {
  message: 'Password cannot be the same as email',
  path: ['password'],
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'text-red-600' };
    if (score <= 3) return { score, label: 'Fair', color: 'text-yellow-600' };
    if (score <= 4) return { score, label: 'Good', color: 'text-blue-600' };
    return { score, label: 'Strong', color: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setSubmitError(null);

    try {
      await authService.register({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        household_income_monthly_after_tax: data.household_income_monthly_after_tax,
        household_size: data.household_size,
        number_of_dependants: data.number_of_dependants,
      });

      setShowSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="text-center">
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">
            Registration successful! Please check your email for verification instructions.
          </div>
        </div>
        <Button
          onClick={() => navigate('/login')}
          className="mt-4"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormError error={submitError || undefined} />

      <Input
        label="Email"
        type="email"
        {...register('email')}
        error={errors.email?.message}
      />

      <div>
        <Input
          label="Password"
          type="password"
          {...register('password')}
          error={errors.password?.message}
        />
        {password && (
          <div className="mt-1">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    passwordStrength.score <= 2 ? 'bg-red-500' :
                    passwordStrength.score <= 3 ? 'bg-yellow-500' :
                    passwordStrength.score <= 4 ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
              <span className={`text-sm ${passwordStrength.color}`}>
                {passwordStrength.label}
              </span>
            </div>
          </div>
        )}
      </div>

      <Input
        label="Confirm Password"
        type="password"
        {...register('confirmPassword')}
        error={errors.confirmPassword?.message}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First Name"
          {...register('first_name')}
          error={errors.first_name?.message}
        />

        <Input
          label="Last Name"
          {...register('last_name')}
          error={errors.last_name?.message}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Household Information (Optional)</h3>

        <Input
          label="Monthly Household Income (After Tax)"
          type="number"
          {...register('household_income_monthly_after_tax', { valueAsNumber: true })}
          error={errors.household_income_monthly_after_tax?.message}
        />

        <Input
          label="Household Size"
          type="number"
          {...register('household_size', { valueAsNumber: true })}
          error={errors.household_size?.message}
        />

        <Input
          label="Number of Dependants"
          type="number"
          {...register('number_of_dependants', { valueAsNumber: true })}
          error={errors.number_of_dependants?.message}
        />
      </div>

      <div className="flex items-center">
        <input
          id="terms"
          name="terms"
          type="checkbox"
          required
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
          I agree to the{' '}
          <a href="#" className="text-blue-600 hover:text-blue-500">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-blue-600 hover:text-blue-500">
            Privacy Policy
          </a>
        </label>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
};