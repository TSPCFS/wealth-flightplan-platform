import type { Stage } from './assessment.types';
import type { StepNumber } from './content.types';
import type { WorksheetCode } from './worksheet.types';

export type EventType =
  | 'assessment_submitted'
  | 'worksheet_submitted'
  | 'step_completed'
  | 'stage_changed';

export type MilestoneUrgency = 'overdue' | 'soon' | 'upcoming';

export type RecommendationSource =
  | 'stage_gap'
  | 'missing_worksheet'
  | 'stale_review'
  | 'high_priority_gap'
  | 'first_step';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface RecommendedAction {
  priority: RecommendationPriority;
  title: string;
  reason: string;
  action_url: string;
  estimated_time_minutes?: number;
  source?: RecommendationSource;
}

export interface ActivityEvent {
  event_type: EventType;
  title: string;
  details?: Record<string, unknown>;
  timestamp: string;
  link?: string | null;
}

export interface MilestoneAchieved {
  code: string;
  title: string;
  date: string;
}

export interface MilestoneUpcoming {
  code: string;
  title: string;
  due_date: string;
  category?: string;
  urgency: MilestoneUrgency;
}

export type Milestone = MilestoneAchieved | MilestoneUpcoming;

export interface StepProgress {
  step_number: StepNumber;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  time_spent_minutes: number;
}

export interface ProgressResponse {
  overall_completion_pct: number;
  steps_completed: number;
  steps_total: number;
  current_focus_step: StepNumber | null;
  steps: StepProgress[];
}

export interface CurrentStageDetails {
  name: Stage;
  description: string;
  income_runway: string;
  progress_to_next_stage_pct: number;
  next_stage: Stage | null;
}

export interface OverallProgressSummary {
  framework_completion_pct: number;
  steps_completed: number;
  steps_total: number;
  current_focus_step: StepNumber | null;
  next_step: { step_number: StepNumber; title: string } | null;
}

export interface QuickStats {
  net_worth: number | null;
  monthly_surplus: number | null;
  total_consumer_debt: number | null;
  income_generating_pct: number | null;
}

export interface DashboardResponse {
  current_stage: Stage | null;
  current_stage_details: CurrentStageDetails | null;
  overall_progress: OverallProgressSummary;
  recommended_actions: RecommendedAction[];
  recent_activity: ActivityEvent[];
  upcoming_milestones: MilestoneUpcoming[];
  quick_stats: QuickStats;
}

export interface ReadingPathEntry {
  order: number;
  step_number: StepNumber;
  title: string;
  status: 'next' | 'upcoming' | 'done';
}

export interface SuggestedExample {
  example_code: string;
  title: string;
  reason: string;
}

export interface SuggestedWorksheet {
  worksheet_code: WorksheetCode;
  title: string;
  reason: string;
}

export interface RecommendationsResponse {
  current_stage: Stage | null;
  immediate_actions: RecommendedAction[];
  reading_path: ReadingPathEntry[];
  suggested_examples: SuggestedExample[];
  suggested_worksheets: SuggestedWorksheet[];
}

export interface ActivityResponse {
  events: ActivityEvent[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface MilestonesResponse {
  achieved: MilestoneAchieved[];
  upcoming: MilestoneUpcoming[];
}

export interface ProfilePatch {
  first_name?: string;
  last_name?: string;
  household_income_monthly_after_tax?: number | null;
  household_size?: number | null;
  number_of_dependants?: number | null;
  is_business_owner?: boolean;
  primary_language?: string;
  timezone?: string;
}
