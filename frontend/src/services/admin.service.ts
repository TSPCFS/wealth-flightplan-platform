// Admin service (Phase 8a). Thin wrapper over apiClient, mirrors the
// pattern used by content.service.ts and user.service.ts. Contract pinned
// in docs/API_CONTRACT.md (lines 943+).

import { apiClient } from './api';
import type {
  AdminAuditFilters,
  AdminAuditLogResponse,
  AdminLeadStatus,
  AdminLeadsFilters,
  AdminLeadsResponse,
  AdminStats,
  AdminUserActionResponse,
  AdminUserDeleteResponse,
  AdminUserDetail,
  AdminUserListResponse,
  AdminUsersFilters,
} from '../types/admin.types';

export const adminService = {
  listUsers(filters: AdminUsersFilters = {}): Promise<AdminUserListResponse> {
    return apiClient.adminListUsers(filters);
  },
  getUser(userId: string): Promise<AdminUserDetail> {
    return apiClient.adminGetUser(userId);
  },
  suspend(userId: string): Promise<AdminUserActionResponse> {
    return apiClient.adminSuspendUser(userId);
  },
  unsuspend(userId: string): Promise<AdminUserActionResponse> {
    return apiClient.adminUnsuspendUser(userId);
  },
  resetPassword(userId: string): Promise<AdminUserActionResponse> {
    return apiClient.adminResetPassword(userId);
  },
  promote(userId: string): Promise<AdminUserActionResponse> {
    return apiClient.adminPromoteUser(userId);
  },
  demote(userId: string): Promise<AdminUserActionResponse> {
    return apiClient.adminDemoteUser(userId);
  },
  deleteUser(userId: string, confirmEmail: string): Promise<AdminUserDeleteResponse> {
    return apiClient.adminDeleteUser(userId, confirmEmail);
  },
  stats(): Promise<AdminStats> {
    return apiClient.adminGetStats();
  },
  audit(filters: AdminAuditFilters = {}): Promise<AdminAuditLogResponse> {
    return apiClient.adminGetAudit(filters);
  },
  listLeads(filters: AdminLeadsFilters = {}): Promise<AdminLeadsResponse> {
    return apiClient.adminListLeads(filters);
  },
  updateLeadStatus(
    leadId: string,
    status: AdminLeadStatus
  ): Promise<AdminLeadsResponse['leads'][number]> {
    return apiClient.adminUpdateLeadStatus(leadId, status);
  },
};
