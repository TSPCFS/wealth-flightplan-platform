import type { Stage } from './assessment.types';

export type { Stage };

export type StepNumber = '1' | '2' | '3' | '4a' | '4b' | '5' | '6';

export type CalculatorType =
  | 'compound_interest'
  | 'debt_analysis'
  | 'budget_allocator'
  | 'net_worth_analyzer';

export type CalculatorFormat = 'currency' | 'integer' | 'percent' | 'decimal';

export type DebtMethod = 'snowball' | 'avalanche' | 'debtonator';

// ───────── Calculator input schemas ─────────

export interface CompoundInterestInput {
  monthly_contribution: number;
  initial_amount?: number;
  years: number;
  annual_rate_pct: number;
  withdrawal_rate_pct?: number;
}

export interface DebtRow {
  name: string;
  balance: number;
  annual_rate_pct: number;
  minimum_payment: number;
}

export interface DebtAnalysisInput {
  debts: DebtRow[];
  surplus_available: number;
  method: DebtMethod;
}

export interface BudgetAllocatorInput {
  income_monthly: number;
  needs: number;
  wants: number;
  invest: number;
}

export interface NetWorthAsset {
  name: string;
  value: number;
}

export interface NetWorthAnalyzerInput {
  lifestyle_assets: NetWorthAsset[];
  income_generating_assets: NetWorthAsset[];
  liabilities: NetWorthAsset[];
}

export type CalculatorInputByType = {
  compound_interest: CompoundInterestInput;
  debt_analysis: DebtAnalysisInput;
  budget_allocator: BudgetAllocatorInput;
  net_worth_analyzer: NetWorthAnalyzerInput;
};

// ───────── Calculator output schemas ─────────

export interface CompoundInterestYear {
  year: number;
  balance: number;
  contributions_to_date: number;
  growth_to_date: number;
}

export interface CompoundInterestOutput {
  final_amount: number;
  total_contributed: number;
  total_growth: number;
  monthly_passive_income: number;
  year_by_year: CompoundInterestYear[];
}

export interface DebtPaymentOrderEntry {
  name: string;
  balance: number;
  annual_rate_pct: number;
  expected_close_month: number;
  reason: string;
}

export interface DebtMonthlyProjectionEntry {
  month: number;
  total_balance: number;
  interest_charged: number;
  accounts_remaining: number;
}

export interface DebtAnalysisOutput {
  total_debt: number;
  weighted_average_rate_pct: number;
  total_monthly_minimums: number;
  debt_free_months: number;
  total_interest_paid: number;
  payment_order: DebtPaymentOrderEntry[];
  monthly_projection: DebtMonthlyProjectionEntry[];
}

export type BudgetCategoryStatus = 'low' | 'on_track' | 'high';

export interface BudgetTargetComparison {
  category: 'needs' | 'wants' | 'invest';
  actual_pct: number;
  target_pct: number;
  status: BudgetCategoryStatus;
}

export type BudgetStatus = 'balanced' | 'deficit' | 'surplus';

export interface BudgetAllocatorOutput {
  total_income: number;
  total_allocated: number;
  surplus_deficit: number;
  needs_pct: number;
  wants_pct: number;
  invest_pct: number;
  status: BudgetStatus;
  feedback: string;
  target_comparison: BudgetTargetComparison[];
}

export interface NetWorthAnalyzerOutput {
  total_lifestyle_assets: number;
  total_income_generating_assets: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  income_generating_pct_of_net_worth: number;
  interpretation: string;
}

export type CalculatorOutputByType = {
  compound_interest: CompoundInterestOutput;
  debt_analysis: DebtAnalysisOutput;
  budget_allocator: BudgetAllocatorOutput;
  net_worth_analyzer: NetWorthAnalyzerOutput;
};

// ───────── Framework + Examples + Case studies ─────────

export interface FrameworkStep {
  step_number: StepNumber;
  title: string;
  subtitle: string;
  description: string;
  key_metrics: string[];
  time_estimate_minutes: number;
  stage_relevance: Stage[];
  related_example_codes: string[];
  related_worksheet_codes: string[];
}

export interface FrameworkResponse {
  steps: FrameworkStep[];
}

export interface StepDetail extends FrameworkStep {
  body_markdown?: string;
}

export interface ExampleSummary {
  example_code: string;
  title: string;
  step_number: StepNumber;
  chapter: string;
  calculator_type: CalculatorType | null;
  stage_relevance: Stage[];
  key_principle: string;
  summary: string;
}

export interface ExamplesListResponse {
  examples: ExampleSummary[];
  total: number;
}

export interface CalculatorInputSpec {
  name: string;
  label: string;
  // `array` and `select` are accommodations the renderer accepts in addition to `number`.
  type: 'number' | 'select' | 'array';
  default?: number | string | unknown[];
  min?: number;
  max?: number;
  step?: number;
  format?: CalculatorFormat;
  options?: { value: string; label: string }[];
  // For array inputs: schema of one row.
  item_schema?: CalculatorInputSpec[];
  description?: string;
}

export interface CalculatorConfig {
  inputs: CalculatorInputSpec[];
  interpretation_template?: string;
}

export interface ExampleDetail {
  example_code: string;
  title: string;
  step_number: StepNumber;
  chapter: string;
  description: string;
  key_principle: string;
  key_takeaway: string;
  educational_text: string;
  stage_relevance: Stage[];
  calculator_type: CalculatorType | null;
  calculator_config: CalculatorConfig | null;
  related_example_codes: string[];
}

export interface CaseStudySummary {
  study_code: string;
  name: string;
  summary: string;
  learning: string;
  stage_relevance: Stage[];
  related_step_numbers: StepNumber[];
}

export interface CaseStudyDetail {
  study_code: string;
  name: string;
  age_band: string;
  income_monthly: number | null;
  situation: string;
  learning: string;
  key_insight: string;
  stage_relevance: Stage[];
  related_step_numbers: StepNumber[];
  related_example_codes: string[];
}

export interface CaseStudiesListResponse {
  case_studies: CaseStudySummary[];
  total: number;
}

// ───────── Calculate endpoint envelope (discriminated) ─────────

interface CalculateResponseBase<T extends CalculatorType> {
  example_code: string;
  calculator_type: T;
  inputs: CalculatorInputByType[T];
  outputs: CalculatorOutputByType[T];
  interpretation: string;
}

export type CalculateResponse =
  | CalculateResponseBase<'compound_interest'>
  | CalculateResponseBase<'debt_analysis'>
  | CalculateResponseBase<'budget_allocator'>
  | CalculateResponseBase<'net_worth_analyzer'>;

export type CalculateInputs =
  | CompoundInterestInput
  | DebtAnalysisInput
  | BudgetAllocatorInput
  | NetWorthAnalyzerInput;

// ───────── Filter shapes ─────────

export interface ExampleFilters {
  step_number?: StepNumber;
  stage?: Stage;
  calculator_type?: CalculatorType;
  has_calculator?: boolean;
  q?: string;
}

export interface CaseStudyFilters {
  stage?: Stage;
  step_number?: StepNumber;
  q?: string;
}
