import { apiClient } from './api';
import type { ProfileResponse } from '../types/api.types';

export const userService = {
  getProfile: (): Promise<ProfileResponse> => {
    return apiClient.getProfile();
  },
};