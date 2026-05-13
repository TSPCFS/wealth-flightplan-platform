import React, { useEffect, useState } from 'react';
import { worksheetService } from '../services/worksheet.service';
import type {
  WorksheetCode,
  WorksheetSubmission,
  WorksheetsListResponse,
} from '../types/worksheet.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { AppLayout } from '../components/common/AppLayout';
import { WorksheetCard } from '../components/worksheets/WorksheetCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const WorksheetsCataloguePage: React.FC = () => {
  useDocumentTitle('Worksheets');
  const [list, setList] = useState<WorksheetsListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestByCode, setLatestByCode] = useState<
    Record<string, WorksheetSubmission | null>
  >({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalogue = await worksheetService.list();
        if (cancelled) return;
        setList(catalogue);

        // Fan out latest() per worksheet in parallel. Failures fall back to null
        // so the catalogue keeps rendering even if one lookup hiccups.
        const results = await Promise.all(
          catalogue.worksheets.map((ws) =>
            worksheetService
              .getLatest(ws.worksheet_code as WorksheetCode)
              .then((v) => [ws.worksheet_code, v] as const)
              .catch(() => [ws.worksheet_code, null] as const)
          )
        );
        if (cancelled) return;
        const map: Record<string, WorksheetSubmission | null> = {};
        for (const [code, v] of results) map[code] = v;
        setLatestByCode(map);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Could not load worksheets.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error} />
      </AppLayout>
    );
  }
  if (!list) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="wide" className="space-y-8">
      <section className="bg-attooh-lime-pale border-l-4 border-attooh-lime rounded-r-xl p-7">
        <p className="font-lato font-bold text-[10px] uppercase tracking-[0.2em] text-attooh-success mb-2">
          Worksheets
        </p>
        <h1 className="font-montserrat text-2xl sm:text-[36px] font-bold text-attooh-charcoal mb-2 tracking-tight">
          Turn the framework into a plan
        </h1>
        <p className="text-base text-attooh-charcoal max-w-2xl">
          Fillable forms that turn the framework into a plan. Drafts autosave as you go, and your past submissions are kept per worksheet.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.worksheets.map((ws) => (
          <WorksheetCard
            key={ws.worksheet_code}
            worksheet={ws}
            latest={latestByCode[ws.worksheet_code] ?? null}
          />
        ))}
      </div>
    </AppLayout>
  );
};
