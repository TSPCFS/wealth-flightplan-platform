import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome{user?.first_name ? `, ${user.first_name}` : ''}!
          </h1>
          <p className="text-gray-600 mb-6">
            This is your dashboard. Phase 1 authentication is complete.
          </p>
          <Button onClick={() => logout()} variant="secondary">
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};
