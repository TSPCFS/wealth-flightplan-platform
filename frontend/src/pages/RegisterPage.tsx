import React from 'react';
import { AuthLayout } from '../components/common/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';

export const RegisterPage: React.FC = () => {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Wealth FlightPlan™ to start your financial journey"
    >
      <RegisterForm />
    </AuthLayout>
  );
};