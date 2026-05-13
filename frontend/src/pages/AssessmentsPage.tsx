import React from 'react';
import { AssessmentSelector } from '../components/assessments/AssessmentSelector';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const AssessmentsPage: React.FC = () => {
  useDocumentTitle('Assessments');
  return <AssessmentSelector />;
};
