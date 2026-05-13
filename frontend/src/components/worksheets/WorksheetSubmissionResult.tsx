import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorksheetSubmission, WorksheetExportFormat } from '../../types/worksheet.types';
import { worksheetService } from '../../services/worksheet.service';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { WorksheetStatusBanner } from './WorksheetStatusBanner';
import { WorksheetSubresult } from './WorksheetSubresult';

interface Props {
  submission: WorksheetSubmission;
}

export const WorksheetSubmissionResult: React.FC<Props> = ({ submission }) => {
  const [exporting, setExporting] = useState<WorksheetExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const onExport = async (format: WorksheetExportFormat) => {
    setExporting(format);
    setExportError(null);
    try {
      await worksheetService.exportFile(submission.worksheet_id, format);
    } catch (err) {
      setExportError((err as Error).message || 'Export failed.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-montserrat text-2xl font-bold text-attooh-charcoal tracking-tight">
          {submission.worksheet_code} results
        </h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onExport('pdf')}
            disabled={exporting !== null}
            aria-label="Export as PDF"
          >
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onExport('csv')}
            disabled={exporting !== null}
            aria-label="Export as CSV"
          >
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </header>

      {exportError && <FormError error={exportError} />}

      {submission.feedback && <WorksheetStatusBanner feedback={submission.feedback} />}

      <WorksheetSubresult
        worksheetCode={submission.worksheet_code}
        values={submission.calculated_values}
      />

      <div className="text-center">
        <Link
          to={`/worksheets/${encodeURIComponent(submission.worksheet_code)}/history`}
          className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
        >
          View history for this worksheet →
        </Link>
      </div>
    </div>
  );
};
