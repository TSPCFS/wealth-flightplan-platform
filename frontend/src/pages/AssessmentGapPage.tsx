import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentFlow } from '../components/assessments/AssessmentFlow';
import { QUESTIONS_GAP } from '../data/assessment-questions';
import { assessmentService } from '../services/assessment.service';
import type { ResponsesGap } from '../types/assessment.types';

export const AssessmentGapPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (responses: Record<string, string>, elapsed: number) => {
    const result = await assessmentService.submitGap(responses as ResponsesGap, elapsed);
    navigate(`/assessments/results/${result.assessment_id}`);
  };

  return (
    <AssessmentFlow
      type="gap_test"
      title="GAP Test™"
      questions={QUESTIONS_GAP}
      onSubmit={handleSubmit}
    />
  );
};
