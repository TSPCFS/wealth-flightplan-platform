import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentFlow } from '../components/assessments/AssessmentFlow';
import { QUESTIONS_5Q } from '../data/assessment-questions';
import { assessmentService } from '../services/assessment.service';
import type { ResponsesLetter } from '../types/assessment.types';

export const Assessment5QPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (responses: Record<string, string>, elapsed: number) => {
    const result = await assessmentService.submit5q(responses as ResponsesLetter, elapsed);
    navigate(`/assessments/results/${result.assessment_id}`);
  };

  return (
    <AssessmentFlow
      type="5q"
      title="5-Question Quick Check"
      questions={QUESTIONS_5Q}
      onSubmit={handleSubmit}
    />
  );
};
