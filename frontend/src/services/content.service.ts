import { apiClient } from './api';
import type {
  CalculateInputs,
  CalculateResponse,
  CalculatorInputByType,
  CalculatorType,
  CaseStudyDetail,
  CaseStudyFilters,
  CaseStudiesListResponse,
  ExampleDetail,
  ExampleFilters,
  ExamplesListResponse,
  FrameworkResponse,
  StepDetail,
  StepNumber,
} from '../types/content.types';

export const contentService = {
  getFramework(): Promise<FrameworkResponse> {
    return apiClient.getFramework();
  },

  getStep(stepNumber: StepNumber): Promise<StepDetail> {
    return apiClient.getStep(stepNumber);
  },

  listExamples(filters: ExampleFilters = {}): Promise<ExamplesListResponse> {
    return apiClient.listExamples(filters);
  },

  getExample(code: string): Promise<ExampleDetail> {
    return apiClient.getExample(code);
  },

  // Typed: callers that pass a known calculator_type get a narrowed response.
  calculate<T extends CalculatorType>(
    code: string,
    inputs: CalculatorInputByType[T]
  ): Promise<CalculateResponse> {
    return apiClient.calculateExample(code, inputs as CalculateInputs);
  },

  listCaseStudies(filters: CaseStudyFilters = {}): Promise<CaseStudiesListResponse> {
    return apiClient.listCaseStudies(filters);
  },

  getCaseStudy(code: string): Promise<CaseStudyDetail> {
    return apiClient.getCaseStudy(code);
  },
};
