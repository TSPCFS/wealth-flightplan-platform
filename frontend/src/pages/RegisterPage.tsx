import React from 'react';
import { AuthLayout } from '../components/common/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const RegisterPage: React.FC = () => {
  useDocumentTitle('Sign up');
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Wealth FlightPlan™ to start your financial journey"
    >
      <RegisterForm />
    </AuthLayout>
  );
};