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
          <Link to="/examples" className="text-blue-600 underline">
            Back to examples
          </Link>
        </div>
      </AppLayout>
    );
  }
  if (!example) return <LoadingSpinner />;

  return (
    <AppLayout maxWidth="narrow" className="space-y-8">
      <header>
        <Link to="/examples" className="text-sm text-blue-600 underline">
          ← Examples
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 break-words">{example.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {example.example_code} · {example.chapter}
        </p>
        {example.stage_relevance.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {example.stage_relevance.map((s) => (
              <span
                key={s}
                className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </header>

      <section className="bg-blue-50 ring-1 ring-blue-100 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold mb-1">Key principle</p>
        <p>{example.key_principle}</p>
      </section>

      {example.description && (
        <section>
          <p className="text-gray-800">{example.description}</p>
        </section>
      )}

      {example.educational_text && (
        <section data-testid="example-educational" className="prose prose-blue max-w-none">
          <ReactMarkdown>{example.educational_text}</ReactMarkdown>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Try it
        </h2>
        <InteractiveCalculator exampleDetail={example} />
      </section>

      {example.key_takeaway && (
        <section className="bg-emerald-50 ring-1 ring-emerald-100 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-1">
            Key takeaway
          </p>
          <p className="text-sm text-emerald-900">{example.key_takeaway}</p>
        </section>
      )}

      {example.related_example_codes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Related examples
          </h2>
          <ul className="flex flex-wrap gap-2">
            {example.related_example_codes.map((code) => (
              <li key={code}>
                <Link
                  to={`/examples/${encodeURIComponent(code)}`}
                  className="inline-flex items-center text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100"
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
