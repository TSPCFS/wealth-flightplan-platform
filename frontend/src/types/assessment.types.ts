export type AssessmentType = '5q' | '10q' | 'gap_test';

export type Stage = 'Foundation' | 'Momentum' | 'Freedom' | 'Independence' | 'Abundance';

export type GapBand = 'solid_plan' | 'meaningful_gaps' | 'wide_gaps';

export type GapAnswer = 'yes' | 'partially' | 'no';

export type LetterAnswer = 'a' | 'b' | 'c' | 'd';

// Generic responses object keyed by question code (q1..q10 or q1..q12).
export type ResponsesLetter = Record<string, LetterAnswer>;
export type ResponsesGap = Record<string, GapAnswer>;

export interface StageDetails {
  name: Stage;
  income_runway: string;
  description: string;
}

export interface StageProgressionEntry {
  stage: Stage;
  score: number;
  date: string;
}

export interface GapIdentified {
  question_code: string;
  title: string;
  current_status: GapAnswer;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

// ───────── Request payloads ─────────

export interface SubmitLetterAssessmentRequest {
  responses: ResponsesLetter;
  completion_time_seconds?: number;
}

export interface SubmitGapAssessmentRequest {
  responses: ResponsesGap;
  completion_time_seconds?: number;
}

// ───────── Response payloads ─────────

export interface StageAssessmentResult {
  assessment_id: string;
  assessment_type: '5q' | '10q';
  total_score: number;
  calculated_stage: Stage;
  previous_stage: Stage | null;
  stage_details: StageDetails;
  recommendations: string[];
  created_at: string;
}

export interface GapAssessmentResult {
  assessment_id: string;
  assessment_type: 'gap_test';
  total_score: number;
  band: GapBand;
  gaps_identified: GapIdentified[];
  advisor_recommendation: string;
  gap_plan_eligible: boolean;
  created_at: string;
}

export type AssessmentResult = StageAssessmentResult | GapAssessmentResult;

// One row in /assessments/history. Fields that don't apply to the type are null.
export interface HistoryEntry {
  assessment_id: string;
  assessment_type: AssessmentType;
  total_score: number;
  calculated_stage: Stage | null;
  band: GapBand | null;
  created_at: string;
}

export interface AssessmentHistoryResponse {
  assessments: HistoryEntry[];
  current_stage: Stage | null;
  stage_progression: StageProgressionEntry[];
}

// Detail response from GET /assessments/{id}. Discriminated by assessment_type.
export interface StageAssessmentDetail extends StageAssessmentResult {
  responses: ResponsesLetter;
  completion_time_seconds: number | null;
}

export interface GapAssessmentDetail extends GapAssessmentResult {
  responses: ResponsesGap;
  completion_time_seconds: number | null;
}

export type AssessmentDetail = StageAssessmentDetail | GapAssessmentDetail;
