import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentFlow } from '../components/assessments/AssessmentFlow';
import { QUESTIONS_10Q } from '../data/assessment-questions';
import { assessmentService } from '../services/assessment.service';
import type { ResponsesLetter } from '../types/assessment.types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const Assessment10QPage: React.FC = () => {
  useDocumentTitle('10-question assessment');
  const navigate = useNavigate();

  const handleSubmit = async (responses: Record<string, string>, elapsed: number) => {
    const result = await assessmentService.submit10q(responses as ResponsesLetter, elapsed);
    navigate(`/assessments/results/${result.assessment_id}`);
  };

  return (
    <AssessmentFlow
      type="10q"
      title="10-Question Full Assessment"
      questions={QUESTIONS_10Q}
      onSubmit={handleSubmit}
    />
  );
};
