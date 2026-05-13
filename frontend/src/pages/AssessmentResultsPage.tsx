import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assessmentService } from '../services/assessment.service';
import type { AssessmentDetail } from '../types/assessment.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { AppLayout } from '../components/common/AppLayout';
import { SectionLabel } from '../components/common/SectionLabel';
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
  solid_plan: 'bg-attooh-lime-pale text-attooh-success',
  meaningful_gaps: 'bg-[#FFF4DA] text-[#9C7611]',
  wide_gaps: 'bg-[rgba(199,54,59,0.1)] text-attooh-danger',
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
          <Link
            to="/assessments"
            className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
          >
            ← Back to assessments
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout maxWidth="narrow" className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
          Your results
        </h1>
        <Link
          to="/assessments"
          className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
        >
          Take another →
        </Link>
      </header>

      {result.assessment_type === 'gap_test' ? (
        <>
          <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7">
            <SectionLabel>Overall band</SectionLabel>
            <div className="flex items-center gap-3 mt-3">
              <span
                className={`inline-flex items-center text-sm font-semibold px-3 py-1 rounded ${bandStyle[result.band]}`}
              >
                {bandLabel[result.band]}
              </span>
              <span className="text-sm text-attooh-muted">Score {result.total_score} / 24</span>
            </div>
            {result.advisor_recommendation && (
              <p className="text-attooh-charcoal mt-4">{result.advisor_recommendation}</p>
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
          className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
        >
          View full history →
        </Link>
      </div>
    </AppLayout>
  );
};
