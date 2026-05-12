import { apiClient } from './api';
import type {
  WorksheetCode,
  WorksheetDraftResponse,
  WorksheetExportFormat,
  WorksheetHistoryResponse,
  WorksheetResponseData,
  WorksheetSchema,
  WorksheetsListResponse,
  WorksheetSubmission,
} from '../types/worksheet.types';

// Trigger a browser download for a Blob by creating an object URL and clicking
// a synthesised anchor. Cleaned up on next tick.
const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke after the click event has been dispatched; otherwise some browsers
  // cancel the download mid-flight.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const worksheetService = {
  list(): Promise<WorksheetsListResponse> {
    return apiClient.listWorksheets();
  },

  getSchema(code: WorksheetCode): Promise<WorksheetSchema> {
    return apiClient.getWorksheetSchema(code);
  },

  saveDraft(
    code: WorksheetCode,
    response_data: WorksheetResponseData,
    completion_percentage: number
  ): Promise<WorksheetDraftResponse> {
    return apiClient.saveWorksheetDraft(code, {
      response_data,
      completion_percentage,
    });
  },

  submit(
    code: WorksheetCode,
    response_data: WorksheetResponseData
  ): Promise<WorksheetSubmission> {
    return apiClient.submitWorksheet(code, {
      response_data,
      completion_percentage: 100,
    });
  },

  getLatest(code: WorksheetCode): Promise<WorksheetSubmission | null> {
    return apiClient.getWorksheetLatest(code);
  },

  // Owner-only fetch-by-id. Enables deep-linking / refresh on /worksheets/results/:id.
  // Returns null when the id is unknown or belongs to another user (the backend
  // returns the same 404 for both — no enumeration).
  getSubmission(worksheetId: string): Promise<WorksheetSubmission | null> {
    return apiClient.getWorksheetSubmission(worksheetId);
  },

  getHistory(code: WorksheetCode): Promise<WorksheetHistoryResponse> {
    return apiClient.getWorksheetHistory(code);
  },

  async exportFile(
    worksheetId: string,
    format: WorksheetExportFormat
  ): Promise<void> {
    const { blob, filename } = await apiClient.exportWorksheet(worksheetId, format);
    triggerBlobDownload(blob, filename);
  },
};
