import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { contentService } from '../services/content.service';
import type { ExampleDetail } from '../types/content.types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FormError } from '../components/common/FormError';
import { AppLayout } from '../components/common/AppLayout';
import { InteractiveCalculator } from '../components/calculators/InteractiveCalculator';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ExampleDetailPage: React.FC = () => {
  const { exampleCode } = useParams<{ exampleCode: string }>();
  const [example, setExample] = useState<ExampleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle(example ? `${example.example_code} · ${example.title}` : null);

  useEffect(() => {
    if (!exampleCode) {
      setError('Missing example code');
      return;
    }
    let cancelled = false;
    contentService
      .getExample(exampleCode)
      .then((res) => !cancelled && setExample(res))
      .catch((err) => !cancelled && setError((err as Error).message || 'Could not load example.'));
    return () => {
      cancelled = true;
    };
  }, [exampleCode]);

  if (error) {
    return (
      <AppLayout maxWidth="narrow" className="py-12">
        <FormError error={error} />
        <div className="mt-6 text-center">
          <Link
            to="/examples"
            className="font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal"
          >
            ← Back to examples
          </Link>
        </div>
      </AppLayout>
    );
  }
  if (!example) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="narrow" className="space-y-8">
      <header>
        <Link
          to="/examples"
          className="inline-flex items-center font-lato font-bold text-xs uppercase tracking-wider text-attooh-lime-hover hover:text-attooh-charcoal mb-3"
        >
          ← Worked examples
        </Link>
        <h1 className="font-montserrat text-2xl sm:text-3xl font-bold text-attooh-charcoal break-words tracking-tight">
          {example.title}
        </h1>
        <p className="text-sm text-attooh-muted mt-1">
          {example.example_code} · {example.chapter}
        </p>
        {example.stage_relevance.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {example.stage_relevance.map((s) => (
              <span
                key={s}
                className="font-lato text-[11px] font-bold uppercase tracking-[0.1em] bg-attooh-lime-pale text-attooh-success px-3.5 py-1.5 rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </header>

      <section className="bg-attooh-lime-pale border-l-4 border-attooh-lime rounded-r-xl p-5">
        <p className="font-lato text-[10px] font-bold uppercase tracking-[0.16em] text-attooh-success mb-1">
          Key principle
        </p>
        <p className="text-[15px] font-medium text-attooh-charcoal">{example.key_principle}</p>
      </section>

      {example.description && (
        <section>
          <p className="text-attooh-charcoal">{example.description}</p>
        </section>
      )}

      {example.educational_text && (
        <section data-testid="example-educational" className="prose max-w-none prose-headings:font-montserrat prose-headings:text-attooh-charcoal prose-p:text-attooh-charcoal">
          <ReactMarkdown>{example.educational_text}</ReactMarkdown>
        </section>
      )}

      <section>
        <InteractiveCalculator exampleDetail={example} />
      </section>

      {example.key_takeaway && (
        <section className="bg-attooh-lime-pale border-l-4 border-attooh-lime rounded-r-xl p-5">
          <p className="font-lato text-[10px] font-bold uppercase tracking-[0.16em] text-attooh-success mb-1">
            Key takeaway
          </p>
          <p className="text-sm text-attooh-charcoal">{example.key_takeaway}</p>
        </section>
      )}

      {example.related_example_codes.length > 0 && (
        <section>
          <p className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-slate mb-3">
            Related examples
          </p>
          <ul className="flex flex-wrap gap-2">
            {example.related_example_codes.map((code) => (
              <li key={code}>
                <Link
                  to={`/examples/${encodeURIComponent(code)}`}
                  className="inline-flex items-center text-sm font-medium text-attooh-success bg-attooh-lime-pale hover:bg-attooh-lime hover:text-attooh-charcoal px-3 py-1 rounded-full transition-colors"
                >
                  {code}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppLayout>
  );
};
