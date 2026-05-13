// Admin (Phase 8) — types mirror the API contract in docs/API_CONTRACT.md
// (lines 943+). Every shape here matches the backend's Pydantic schema 1:1.

import type { Stage } from './assessment.types';

export type AccountStatus = 'active' | 'inactive' | 'locked' | 'suspended';

export interface AdminUserListItem {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_business_owner: boolean;
  email_verified: boolean;
  account_status: AccountStatus;
  suspended_at: string | null;
  locked_until: string | null;
  subscription_tier: string;
  created_at: string;
  last_login: string | null;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface AdminUserDetail {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_business_owner: boolean;
  email_verified: boolean;
  email_verified_at: string | null;
  account_status: AccountStatus;
  suspended_at: string | null;
  locked_until: string | null;
  subscription_tier: string;
  household_income_monthly_after_tax: number | null;
  household_size: number | null;
  number_of_dependants: number | null;
  primary_language: string | null;
  timezone: string | null;
  current_stage: Stage | null;
  latest_assessment_id: string | null;
  created_at: string;
  updated_at: string | null;
  last_login: string | null;
  counts: {
    assessments: number;
    worksheet_submissions: number;
    worksheet_drafts: number;
    example_interactions: number;
    chatbot_conversations: number;
    chatbot_leads: number;
    framework_steps_completed: number;
  };
}

export interface AdminUserActionResponse {
  user: AdminUserDetail;
  message: string;
}

export interface AdminUserDeleteResponse {
  deleted_user_id: string;
  message: string;
}

export interface AdminUsersFilters {
  q?: string;
  is_admin?: boolean;
  verified?: boolean;
  suspended?: boolean;
  page?: number;
  page_size?: number;
}

export interface AdminStats {
  total_users: number;
  verified_users: number;
  suspended_users: number;
  admins: number;
  new_signups_7d: number;
  new_signups_30d: number;
}

export interface AdminAuditLogEntry {
  log_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  new_values: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export interface AdminAuditLogResponse {
  entries: AdminAuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface AdminAuditFilters {
  acting_user_id?: string;
  action?: string;
  since?: string;
  until?: string;
  page?: number;
  page_size?: number;
}

export type LeadTriggerEventName =
  | 'worksheet_complete'
  | 'calculator_complete'
  | 'regulated_question'
  | 'user_request'
  | 'step_complete';

export type AdminLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';

export interface AdminLeadItem {
  lead_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  conversation_id: string | null;
  trigger_event: LeadTriggerEventName;
  topic: string | null;
  message: string | null;
  advisor_email: string;
  status: AdminLeadStatus;
  created_at: string;
  contacted_at: string | null;
}

export interface AdminLeadsResponse {
  leads: AdminLeadItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface AdminLeadsFilters {
  status?: AdminLeadStatus;
  page?: number;
  page_size?: number;
}
