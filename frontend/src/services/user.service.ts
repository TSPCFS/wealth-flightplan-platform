import { apiClient } from './api';
import type { ProfileResponse } from '../types/api.types';
import type { StepNumber } from '../types/content.types';
import type {
  ActivityResponse,
  DashboardResponse,
  MilestonesResponse,
  ProfilePatch,
  ProgressResponse,
  RecommendationsResponse,
  ResetProgressResponse,
} from '../types/user.types';

export const userService = {
  getProfile(): Promise<ProfileResponse> {
    return apiClient.getProfile();
  },

  updateProfile(patch: ProfilePatch): Promise<ProfileResponse> {
    return apiClient.updateProfile(patch);
  },

  getDashboard(): Promise<DashboardResponse> {
    return apiClient.getDashboard();
  },

  getRecommendations(): Promise<RecommendationsResponse> {
    return apiClient.getRecommendations();
  },

  getProgress(): Promise<ProgressResponse> {
    return apiClient.getUserProgress();
  },

  getActivity(cursor?: string, limit?: number): Promise<ActivityResponse> {
    return apiClient.getActivity(cursor, limit);
  },

  getMilestones(): Promise<MilestonesResponse> {
    return apiClient.getMilestones();
  },

  setStepComplete(stepNumber: StepNumber, completed: boolean): Promise<ProgressResponse> {
    return completed
      ? apiClient.setStepComplete(stepNumber)
      : apiClient.setStepIncomplete(stepNumber);
  },

  resetProgress(): Promise<ResetProgressResponse> {
    return apiClient.resetProgress();
  },
};
