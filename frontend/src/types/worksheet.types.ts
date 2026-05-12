import type { CalculatorInputSpec, StepNumber } from './content.types';
import type {
  BudgetAllocatorOutput,
  DebtAnalysisOutput,
  NetWorthAnalyzerOutput,
} from './content.types';

export type WorksheetCode =
  | 'APP-A'
  | 'APP-B'
  | 'APP-C'
  | 'APP-D'
  | 'APP-E'
  | 'APP-F'
  | 'APP-G';

export type WorksheetExportFormat = 'pdf' | 'csv';

export interface WorksheetSummary {
  worksheet_code: WorksheetCode;
  title: string;
  description: string;
  related_step_number?: StepNumber | null;
  related_example_codes?: string[];
  estimated_time_minutes: number;
  has_calculator: boolean;
}

export interface WorksheetsListResponse {
  worksheets: WorksheetSummary[];
  total: number;
}

// Section shapes. Backend may either set `type: 'array'` explicitly OR signal
// repeating rows by populating `item_schema`. The renderer treats both as
// array sections.
export interface ScalarWorksheetSection {
  name: string;
  label: string;
  description?: string;
  fields: CalculatorInputSpec[];
}

export interface ArrayWorksheetSection {
  name: string;
  label: string;
  description?: string;
  type: 'array';
  fields?: CalculatorInputSpec[];
  item_schema: CalculatorInputSpec[];
  min_items?: number;
  max_items?: number;
}

export type WorksheetSection = ScalarWorksheetSection | ArrayWorksheetSection;

export const isArraySection = (s: WorksheetSection): s is ArrayWorksheetSection =>
  (s as ArrayWorksheetSection).type === 'array' ||
  Boolean((s as ArrayWorksheetSection).item_schema);

export interface WorksheetSchema {
  worksheet_code: WorksheetCode;
  title: string;
  description: string;
  sections: WorksheetSection[];
}

// Free-form per-section response data. For scalar sections this is
// Record<fieldName, scalar>; for array sections it's Record<fieldName, scalar>[].
export type WorksheetSectionData =
  | Record<string, unknown>
  | Record<string, unknown>[];

export type WorksheetResponseData = Record<string, WorksheetSectionData>;

export interface WorksheetFeedback {
  status: 'on_track' | 'needs_attention' | 'critical';
  message: string;
  recommendations: string[];
}

// Calculated values are worksheet-specific. We keep them open and let the
// per-code subresult adapters interpret them.
export type WorksheetCalculatedValues = Record<string, unknown> | null;

export interface WorksheetDraftResponse {
  worksheet_id: string;
  worksheet_code: WorksheetCode;
  is_draft: true;
  completion_percentage: number;
  updated_at: string;
}

export interface WorksheetSubmission {
  worksheet_id: string;
  worksheet_code: WorksheetCode;
  is_draft: boolean;
  response_data: WorksheetResponseData;
  calculated_values: WorksheetCalculatedValues;
  feedback: WorksheetFeedback | null;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface WorksheetHistoryEntry {
  worksheet_id: string;
  completion_percentage: number;
  calculated_values_summary: Record<string, unknown>;
  created_at: string;
}

export interface WorksheetHistoryResponse {
  worksheet_code: WorksheetCode;
  submissions: WorksheetHistoryEntry[];
}

export interface WorksheetSaveDraftRequest {
  response_data: WorksheetResponseData;
  completion_percentage: number;
}

// Re-export the calculated-value shapes we adapt to in the subresult adapters
// so consumers can import everything from one file.
export type {
  BudgetAllocatorOutput,
  DebtAnalysisOutput,
  NetWorthAnalyzerOutput,
};
