import React from 'react';
import type { AssessmentQuestion } from '../../data/assessment-questions';

interface QuestionCardProps {
  question: AssessmentQuestion;
  value: string | null;
  onChange: (value: string) => void;
  questionNumber: number;
  total: number;
}

// Native radio inputs grouped under <fieldset>: arrow keys move selection,
// 44px+ tap targets, and the legend gives the question its accessible name.
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  value,
  onChange,
  questionNumber,
  total,
}) => {
  const groupName = `assessment-${question.code}`;

  return (
    <fieldset className="bg-white rounded-lg shadow p-6 sm:p-8">
      <legend className="sr-only">
        Question {questionNumber} of {total}: {question.prompt}
      </legend>
      <p className="text-sm font-medium text-blue-700 mb-1" aria-hidden="true">
        Question {questionNumber} of {total}
      </p>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">{question.prompt}</h2>
      {question.helperText && (
        <p className="text-sm text-gray-500 mb-4">{question.helperText}</p>
      )}

      <div role="radiogroup" aria-labelledby={`${groupName}-legend`} className="space-y-3 mt-4">
        {question.options.map((option) => {
          const id = `${groupName}-${option.value}`;
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex items-center min-h-[44px] px-4 py-3 rounded-md border cursor-pointer transition-colors ${
                selected
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                id={id}
                name={groupName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-base text-gray-900">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
