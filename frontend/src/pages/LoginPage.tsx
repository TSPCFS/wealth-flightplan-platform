import React from 'react';
import { AuthLayout } from '../components/common/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const LoginPage: React.FC = () => {
  useDocumentTitle('Sign in');
  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Welcome back to Wealth FlightPlan™"
    >
      <LoginForm />
    </AuthLayout>
  );
};