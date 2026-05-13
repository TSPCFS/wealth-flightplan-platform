import React from 'react';
import { Link } from 'react-router-dom';
import type { ExampleSummary } from '../../types/content.types';

interface ExampleCardProps {
  example: ExampleSummary;
}

export const ExampleCard: React.FC<ExampleCardProps> = ({ example }) => (
  <Link
    to={`/examples/${encodeURIComponent(example.example_code)}`}
    className="block bg-white rounded-lg shadow border border-transparent p-5 hover:border-blue-500 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
      <span className="font-medium">{example.example_code}</span>
      {example.calculator_type && (
        <span className="inline-flex items-center text-xs font-medium bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
          Has calculator
        </span>
      )}
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-1">{example.title}</h3>
    <p className="text-xs text-gray-500 mb-2">{example.chapter}</p>
    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{example.key_principle}</p>
    {example.stage_relevance.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {example.stage_relevance.map((s) => (
          <span
            key={s}
            className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
          >
            {s}
          </span>
        ))}
      </div>
    )}
  </Link>
);
