import React from 'react';
import { Link } from 'react-router-dom';

interface SelectorCard {
  to: string;
  title: string;
  time: string;
  description: string;
}

const CARDS: SelectorCard[] = [
  {
    to: '/assessments/5q',
    title: '5-Question Quick Check',
    time: '~2 minutes',
    description:
      'A fast placement on your current stage. Best if you want a quick read on where you stand.',
  },
  {
    to: '/assessments/10q',
    title: '10-Question Full Assessment',
    time: '~5 minutes',
    description:
      'A deeper placement covering will, TFSA, retirement, insurance and net worth tracking.',
  },
  {
    to: '/assessments/gap',
    title: 'GAP Test™',
    time: '~6 minutes',
    description:
      'Twelve targeted yes / partially / no questions that surface the specific gaps in your plan.',
  },
];

export const AssessmentSelector: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose an assessment</h1>
        <p className="text-gray-600">
          Pick the format that fits your time. Your previous results stay on your dashboard.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="block bg-white rounded-lg shadow p-6 border border-transparent hover:border-blue-500 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="text-xs uppercase tracking-wide text-blue-700 font-semibold mb-2">
              {card.time}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h2>
            <p className="text-sm text-gray-600 mb-4">{card.description}</p>
            <span className="inline-flex items-center text-sm font-medium text-blue-600">
              Start →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
