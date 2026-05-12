import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionCard } from './QuestionCard';
import type { AssessmentQuestion } from '../../data/assessment-questions';

const question: AssessmentQuestion = {
  code: 'q1',
  prompt: 'How is your household budget structured?',
  options: [
    { value: 'a', label: 'No budget' },
    { value: 'b', label: 'Rough mental tally' },
    { value: 'c', label: 'Written budget' },
    { value: 'd', label: 'Zero-based' },
  ],
  helperText: 'Helpful clarification here.',
};

describe('QuestionCard', () => {
  it('renders the prompt, helper text and all options', () => {
    render(
      <QuestionCard
        question={question}
        value={null}
        onChange={vi.fn()}
        questionNumber={2}
        total={5}
      />
    );

    expect(screen.getByText(question.prompt)).toBeInTheDocument();
    expect(screen.getByText('Helpful clarification here.')).toBeInTheDocument();
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
    for (const option of question.options) {
      expect(screen.getByLabelText(option.label)).toBeInTheDocument();
    }
  });

  it('emits onChange with the option value when selected', () => {
    const onChange = vi.fn();
    render(
      <QuestionCard
        question={question}
        value={null}
        onChange={onChange}
        questionNumber={1}
        total={5}
      />
    );
    fireEvent.click(screen.getByLabelText('Written budget'));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('reflects the selected value as checked', () => {
    render(
      <QuestionCard
        question={question}
        value="b"
        onChange={vi.fn()}
        questionNumber={1}
        total={5}
      />
    );
    expect(screen.getByLabelText('Rough mental tally')).toBeChecked();
    expect(screen.getByLabelText('No budget')).not.toBeChecked();
  });
});
