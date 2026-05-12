import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorksheetForm } from './WorksheetForm';
import type { WorksheetSchema } from '../../types/worksheet.types';

vi.mock('../../services/worksheet.service', () => ({
  worksheetService: {
    saveDraft: vi.fn(),
    submit: vi.fn(),
    getLatest: vi.fn(),
    getHistory: vi.fn(),
    list: vi.fn(),
    getSchema: vi.fn(),
    exportFile: vi.fn(),
  },
}));

const schema: WorksheetSchema = {
  worksheet_code: 'APP-A',
  title: 'Zero-Based Budget',
  description: 'Income − (Needs + Wants + Invest) = 0',
  sections: [
    {
      name: 'income',
      label: 'Income',
      fields: [
        { name: 'salary_1', label: 'Salary 1', type: 'number', min: 0, format: 'currency' },
      ],
    },
    {
      name: 'needs',
      label: 'Needs',
      fields: [
        { name: 'bond', label: 'Bond', type: 'number', min: 0, format: 'currency' },
      ],
    },
  ],
};

const fillEveryField = () => {
  fireEvent.change(screen.getByLabelText('Salary 1'), { target: { value: '45000' } });
  fireEvent.change(screen.getByLabelText('Bond'), { target: { value: '11000' } });
};

const renderForm = (ui = <WorksheetForm schema={schema} />) =>
  render(
    <MemoryRouter initialEntries={['/worksheets/APP-A']}>
      <Routes>
        <Route path="/worksheets/APP-A" element={ui} />
        <Route
          path="/worksheets/results/:id"
          element={<div data-testid="results">RESULTS</div>}
        />
      </Routes>
    </MemoryRouter>
  );

describe('WorksheetForm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  it('renders one card per section with all fields', () => {
    vi.useRealTimers();
    renderForm();
    expect(screen.getByRole('heading', { name: 'Income' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Needs' })).toBeInTheDocument();
    expect(screen.getByLabelText('Salary 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Bond')).toBeInTheDocument();
  });

  it('autosaves once after rapid keystrokes (1s debounce)', async () => {
    const { worksheetService } = await import('../../services/worksheet.service');
    vi.mocked(worksheetService.saveDraft).mockResolvedValue({
      worksheet_id: 'd1',
      worksheet_code: 'APP-A',
      is_draft: true,
      completion_percentage: 50,
      updated_at: '2026-05-12T10:30:00Z',
    });

    renderForm();
    const salary = screen.getByLabelText('Salary 1');
    fireEvent.change(salary, { target: { value: '10000' } });
    fireEvent.change(salary, { target: { value: '20000' } });
    fireEvent.change(salary, { target: { value: '30000' } });
    // 200ms in: no call yet
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(worksheetService.saveDraft).not.toHaveBeenCalled();
    // Past the debounce window: a single call with the latest value
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(worksheetService.saveDraft).toHaveBeenCalledTimes(1);
    const [code, data, pct] = vi.mocked(worksheetService.saveDraft).mock.calls[0];
    expect(code).toBe('APP-A');
    expect((data.income as Record<string, number>).salary_1).toBe(30000);
    expect(typeof pct).toBe('number');
  });

  it('restores answers from initialData', () => {
    vi.useRealTimers();
    renderForm(
      <WorksheetForm
        schema={schema}
        initialData={{ income: { salary_1: 45000 }, needs: { bond: 11000 } }}
      />
    );
    expect((screen.getByLabelText('Salary 1') as HTMLInputElement).value).toBe('45000');
    expect((screen.getByLabelText('Bond') as HTMLInputElement).value).toBe('11000');
  });

  it('Submit is disabled until completion = 100', () => {
    vi.useRealTimers();
    renderForm();
    const submit = screen.getByRole('button', { name: /submit worksheet/i });
    expect(submit).toBeDisabled();
    fillEveryField();
    expect(submit).not.toBeDisabled();
  });

  it('submits and navigates to /worksheets/results/:id', async () => {
    vi.useRealTimers();
    const { worksheetService } = await import('../../services/worksheet.service');
    vi.mocked(worksheetService.submit).mockResolvedValue({
      worksheet_id: 'sub-1',
      worksheet_code: 'APP-A',
      is_draft: false,
      response_data: {},
      calculated_values: { total_income: 45000 },
      feedback: { status: 'on_track', message: 'ok', recommendations: [] },
      completion_percentage: 100,
      created_at: '2026-05-12T10:30:00Z',
      updated_at: '2026-05-12T10:30:00Z',
    });

    renderForm();
    fillEveryField();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit worksheet/i }));
    });
    await waitFor(() => expect(worksheetService.submit).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('results')).toBeInTheDocument());
  });

  it('maps server VALIDATION_ERROR details into per-field errors', async () => {
    vi.useRealTimers();
    const { worksheetService } = await import('../../services/worksheet.service');
    vi.mocked(worksheetService.submit).mockRejectedValue({
      code: 'VALIDATION_ERROR',
      message: 'bad',
      details: { 'needs.bond': ['Bond must be ≥ 0'] },
    });

    renderForm();
    fillEveryField();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit worksheet/i }));
    });
    await waitFor(() =>
      expect(screen.getByText('Some fields need attention.')).toBeInTheDocument()
    );
    expect(screen.getByText('Bond must be ≥ 0')).toBeInTheDocument();
  });
});
