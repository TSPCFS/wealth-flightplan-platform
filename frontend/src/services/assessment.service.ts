import { apiClient } from './api';
import type {
  AssessmentDetail,
  AssessmentHistoryResponse,
  GapAssessmentResult,
  ResponsesGap,
  ResponsesLetter,
  StageAssessmentResult,
} from '../types/assessment.types';

export const assessmentService = {
  submit5q(
    responses: ResponsesLetter,
    completionTimeSeconds?: number
  ): Promise<StageAssessmentResult> {
    return apiClient.submit5q({
      responses,
      completion_time_seconds: completionTimeSeconds,
    });
  },

  submit10q(
    responses: ResponsesLetter,
    completionTimeSeconds?: number
  ): Promise<StageAssessmentResult> {
    return apiClient.submit10q({
      responses,
      completion_time_seconds: completionTimeSeconds,
    });
  },

  submitGap(
    responses: ResponsesGap,
    completionTimeSeconds?: number
  ): Promise<GapAssessmentResult> {
    return apiClient.submitGap({
      responses,
      completion_time_seconds: completionTimeSeconds,
    });
  },

  getHistory(): Promise<AssessmentHistoryResponse> {
    return apiClient.getAssessmentHistory();
  },

  getOne(id: string): Promise<AssessmentDetail> {
    return apiClient.getAssessment(id);
  },
};
