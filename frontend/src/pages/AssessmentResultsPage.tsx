import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assessmentService } from '../services/assessment.service';
import type { AssessmentDetail } from '../types/assessment.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { AppLayout } from '../components/common/AppLayout';
import { StageDisplay } from '../components/assessments/StageDisplay';
import { GapsList } from '../components/assessments/GapsList';
import { RecommendationsList } from '../components/assessments/RecommendationsList';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const bandLabel: Record<string, string> = {
  solid_plan: 'Solid plan',
  meaningful_gaps: 'Meaningful gaps',
  wide_gaps: 'Wide gaps',
};

const bandStyle: Record<string, string> = {
  solid_plan: 'bg-green-50 text-green-700',
  meaningful_gaps: 'bg-yellow-50 text-yellow-800',
  wide_gaps: 'bg-red-50 text-red-700',
};

export const AssessmentResultsPage: React.FC = () => {
  useDocumentTitle('Assessment results');
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<AssessmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError('Missing assessment id');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await assessmentService.getOne(id);
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) {
          const apiErr = err as { message?: string };
          setError(apiErr.message ?? 'Could not load assessment.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error || !result) {
    return (
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error ?? 'Assessment not found.'} />
        <div className="mt-6 text-center">
          <Link to="/assessments" className="text-blue-600 hover:text-blue-800 underline">
            Back to assessments
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout maxWidth="narrow" className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Your results</h1>
        <Link to="/assessments" className="text-sm text-blue-600 hover:text-blue-800 underline">
          Take another
        </Link>
      </header>

      {result.assessment_type === 'gap_test' ? (
        <>
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Overall band
            </h2>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center text-sm font-semibold px-3 py-1 rounded ${bandStyle[result.band]}`}
              >
                {bandLabel[result.band]}
              </span>
              <span className="text-sm text-gray-600">Score {result.total_score} / 24</span>
            </div>
            {result.advisor_recommendation && (
              <p className="text-gray-800 mt-4">{result.advisor_recommendation}</p>
            )}
          </section>
          <GapsList gaps={result.gaps_identified} />
        </>
      ) : (
        <>
          <StageDisplay
            calculatedStage={result.calculated_stage}
            previousStage={result.previous_stage}
            stageDetails={result.stage_details}
            totalScore={result.total_score}
          />
          <RecommendationsList recommendations={result.recommendations} />
        </>
      )}

      <div className="text-center">
        <Link
          to="/assessments/history"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          View full history
        </Link>
      </div>
    </AppLayout>
  );
};
