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
    <fieldset className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7 sm:p-9">
      <legend className="sr-only">
        Question {questionNumber} of {total}: {question.prompt}
      </legend>
      <p
        className="font-lato font-bold text-[11px] uppercase tracking-[0.16em] text-attooh-lime-hover mb-2"
        aria-hidden="true"
      >
        Question {questionNumber} of {total}
      </p>
      <h2 className="text-lg sm:text-xl font-bold text-attooh-charcoal mb-2">{question.prompt}</h2>
      {question.helperText && (
        <p className="text-sm text-attooh-muted mb-4">{question.helperText}</p>
      )}

      <div role="radiogroup" aria-labelledby={`${groupName}-legend`} className="space-y-3 mt-4">
        {question.options.map((option) => {
          const id = `${groupName}-${option.value}`;
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex items-center min-h-[44px] px-4 py-3 rounded-lg border-[1.5px] cursor-pointer transition-colors ${
                selected
                  ? 'border-attooh-lime bg-attooh-lime-pale'
                  : 'border-attooh-border hover:bg-attooh-bg'
              }`}
            >
              <input
                type="radio"
                id={id}
                name={groupName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="h-4 w-4 text-attooh-lime border-attooh-border focus:ring-attooh-lime"
              />
              <span className="ml-3 text-base text-attooh-charcoal">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
