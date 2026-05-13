import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

type VerifyStatus = 'loading' | 'success' | 'error';

export const EmailVerificationPage: React.FC = () => {
  useDocumentTitle('Verify email');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [message, setMessage] = useState<string>('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await authService.verify(token);
        if (cancelled) return;
        setStatus('success');
        setMessage('Email verified successfully!');
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'success' ? (
            <div role="status" className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{message}</div>
            </div>
          ) : (
            <div role="alert" className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{message}</div>
            </div>
          )}

          <Button onClick={() => navigate('/login')} className="mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
};
