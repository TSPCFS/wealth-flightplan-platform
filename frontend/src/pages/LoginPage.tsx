import React from 'react';
import { AuthLayout } from '../components/common/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Welcome back to Wealth FlightPlan™"
    >
      <LoginForm />
    </AuthLayout>
  );
};