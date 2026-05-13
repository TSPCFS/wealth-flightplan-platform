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
    <div className="min-h-screen flex items-center justify-center bg-attooh-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-attooh-card border border-attooh-border rounded-2xl shadow-attooh-md p-8 text-center space-y-5">
          {status === 'success' ? (
            <div
              role="status"
              className="rounded-r-lg bg-attooh-lime-pale border-l-4 border-attooh-lime p-4 text-left"
            >
              <p className="font-lato text-[10px] font-bold uppercase tracking-[0.16em] text-attooh-success mb-1">
                Verified
              </p>
              <div className="text-sm text-attooh-charcoal">{message}</div>
            </div>
          ) : (
            <div
              role="alert"
              className="rounded-r-lg bg-[rgba(199,54,59,0.08)] border-l-4 border-attooh-danger p-4 text-left"
            >
              <p className="font-lato text-[10px] font-bold uppercase tracking-[0.16em] text-attooh-danger mb-1">
                Verification failed
              </p>
              <div className="text-sm text-attooh-charcoal">{message}</div>
            </div>
          )}

          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
};
