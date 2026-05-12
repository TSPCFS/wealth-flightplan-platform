import { describe, it, expect, vi, beforeEach } from 'vitest';
import { worksheetService } from './worksheet.service';

vi.mock('./api', () => ({
  ACCESS_TOKEN_KEY: 'wfp.access_token',
  REFRESH_TOKEN_KEY: 'wfp.refresh_token',
  apiClient: {
    listWorksheets: vi.fn(),
    getWorksheetSchema: vi.fn(),
    saveWorksheetDraft: vi.fn(),
    submitWorksheet: vi.fn(),
    getWorksheetLatest: vi.fn(),
    getWorksheetHistory: vi.fn(),
    exportWorksheet: vi.fn(),
  },
}));

describe('worksheetService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('delegates list / getSchema / getLatest / getHistory', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.listWorksheets).mockResolvedValue({ worksheets: [], total: 0 });
    vi.mocked(apiClient.getWorksheetSchema).mockResolvedValue({
      worksheet_code: 'APP-A',
      title: 't',
      description: 'd',
      sections: [],
    });
    vi.mocked(apiClient.getWorksheetLatest).mockResolvedValue(null);
    vi.mocked(apiClient.getWorksheetHistory).mockResolvedValue({
      worksheet_code: 'APP-A',
      submissions: [],
    });

    await worksheetService.list();
    await worksheetService.getSchema('APP-A');
    await worksheetService.getLatest('APP-A');
    await worksheetService.getHistory('APP-A');

    expect(apiClient.listWorksheets).toHaveBeenCalled();
    expect(apiClient.getWorksheetSchema).toHaveBeenCalledWith('APP-A');
    expect(apiClient.getWorksheetLatest).toHaveBeenCalledWith('APP-A');
    expect(apiClient.getWorksheetHistory).toHaveBeenCalledWith('APP-A');
  });

  it('saveDraft / submit forward shape correctly', async () => {
    const { apiClient } = await import('./api');
    vi.mocked(apiClient.saveWorksheetDraft).mockResolvedValue({
      worksheet_id: 'd',
      worksheet_code: 'APP-A',
      is_draft: true,
      completion_percentage: 25,
      updated_at: '',
    });
    vi.mocked(apiClient.submitWorksheet).mockResolvedValue({
      worksheet_id: 's',
      worksheet_code: 'APP-A',
      is_draft: false,
      response_data: {},
      calculated_values: null,
      feedback: null,
      completion_percentage: 100,
      created_at: '',
      updated_at: '',
    });

    await worksheetService.saveDraft('APP-A', { income: { salary_1: 45000 } }, 25);
    await worksheetService.submit('APP-A', { income: { salary_1: 45000 } });

    expect(apiClient.saveWorksheetDraft).toHaveBeenCalledWith('APP-A', {
      response_data: { income: { salary_1: 45000 } },
      completion_percentage: 25,
    });
    expect(apiClient.submitWorksheet).toHaveBeenCalledWith('APP-A', {
      response_data: { income: { salary_1: 45000 } },
      completion_percentage: 100,
    });
  });

  it('exportFile streams a Blob through an anchor click', async () => {
    const { apiClient } = await import('./api');
    const blob = new Blob(['hello'], { type: 'application/pdf' });
    vi.mocked(apiClient.exportWorksheet).mockResolvedValue({
      blob,
      filename: 'sub-1.pdf',
    });

    const createUrl = vi.fn(() => 'blob:fake');
    const revokeUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createUrl, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeUrl, configurable: true });

    const click = vi.fn();
    const originalCreate = document.createElement.bind(document);
    const anchorSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        (el as HTMLAnchorElement).click = click;
      }
      return el;
    });

    await worksheetService.exportFile('sub-1', 'pdf');

    expect(apiClient.exportWorksheet).toHaveBeenCalledWith('sub-1', 'pdf');
    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();

    anchorSpy.mockRestore();
  });
});
