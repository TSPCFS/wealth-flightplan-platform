import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { WorksheetSubmission } from '../types/worksheet.types';
import { worksheetService } from '../services/worksheet.service';
import { FormError } from '../components/common/FormError';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { WorksheetSubmissionResult } from '../components/worksheets/WorksheetSubmissionResult';

interface ResultsLocationState {
  submission?: WorksheetSubmission;
}

export const WorksheetResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as ResultsLocationState;

  // Prefer the submission passed in via router state (just-submitted /
  // navigated-from-history), fall back to refetching by id for deep links
  // and refreshes.
  const [submission, setSubmission] = useState<WorksheetSubmission | null>(
    state.submission ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (submission || !id) return;
    let cancelled = false;
    setLoading(true);
    worksheetService
      .getSubmission(id)
      .then((res) => {
        if (cancelled) return;
        if (res === null) {
          setError('Submission not found. It may have been deleted.');
        } else {
          setSubmission(res);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load this submission. Try opening it from the worksheet history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, submission]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <FormError error={error || 'Missing submission.'} />
        <div className="text-center">
          <Link to="/worksheets" className="text-blue-600 underline">
            Back to worksheets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/worksheets" className="text-sm text-blue-600 underline">
        ← Worksheets
      </Link>
      <div className="mt-4">
        <WorksheetSubmissionResult submission={submission} />
      </div>
    </div>
  );
};
