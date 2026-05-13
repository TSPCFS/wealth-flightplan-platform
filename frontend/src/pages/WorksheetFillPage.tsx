import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { worksheetService } from '../services/worksheet.service';
import type {
  WorksheetCode,
  WorksheetResponseData,
  WorksheetSchema,
} from '../types/worksheet.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { AppLayout } from '../components/common/AppLayout';
import { WorksheetForm } from '../components/worksheets/WorksheetForm';

const VALID_CODES: WorksheetCode[] = ['APP-A', 'APP-B', 'APP-C', 'APP-D', 'APP-E', 'APP-F', 'APP-G'];

const isWorksheetCode = (v: string | undefined): v is WorksheetCode =>
  Boolean(v) && (VALID_CODES as string[]).includes(v as string);

export const WorksheetFillPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [schema, setSchema] = useState<WorksheetSchema | null>(null);
  const [initialData, setInitialData] = useState<WorksheetResponseData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isWorksheetCode(code)) {
      setError('Unknown worksheet');
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [schemaRes, latest] = await Promise.all([
          worksheetService.getSchema(code),
          worksheetService.getLatest(code).catch(() => null),
        ]);
        if (cancelled) return;
        setSchema(schemaRes);
        // Only restore the draft body; once a worksheet has been submitted, we
        // start the next attempt from a clean slate to avoid surprising overwrites.
        if (latest?.is_draft) {
          setInitialData(latest.response_data);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Could not load worksheet.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!ready) return <LoadingSpinner />;
  if (error || !schema) {
    return (
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error ?? 'Worksheet not found.'} />
        <div className="mt-6 text-center">
          <Link to="/worksheets" className="text-blue-600 underline">
            Back to worksheets
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout maxWidth="narrow">
      <Link to="/worksheets" className="text-sm text-blue-600 underline">
        ← Worksheets
      </Link>
      <div className="mt-4">
        <WorksheetForm schema={schema} initialData={initialData} />
      </div>
      <div className="text-center mt-6">
        <Link
          to={`/worksheets/${encodeURIComponent(schema.worksheet_code)}/history`}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          View past submissions
        </Link>
      </div>
    </AppLayout>
  );
};
