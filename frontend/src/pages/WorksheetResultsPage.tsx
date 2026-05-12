import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { WorksheetSubmission } from '../types/worksheet.types';
import { FormError } from '../components/common/FormError';
import { WorksheetSubmissionResult } from '../components/worksheets/WorksheetSubmissionResult';

interface ResultsLocationState {
  submission?: WorksheetSubmission;
}

export const WorksheetResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as ResultsLocationState;
  const submission = state.submission ?? null;

  // The contract doesn't expose a GET /worksheets/{worksheet_id} detail
  // endpoint, so deep-links / refreshes can't refetch by id on their own.
  // Send the user back to the catalogue with a clear next step rather than
  // showing a confusing blank state.
  if (!submission) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <FormError
          error={
            id
              ? `This view needs fresh submission data — please re-open submission ${id} from the worksheet history.`
              : 'Missing submission.'
          }
        />
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
