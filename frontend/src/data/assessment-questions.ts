// Question text is copied verbatim from docs/API_CONTRACT.md → Question catalogue.
// Keep this file flat (no JSX) so tests and the backend-shape-agnostic UI can both import it.

export interface AssessmentOption {
  value: string;
  label: string;
}

export interface AssessmentQuestion {
  code: string;
  prompt: string;
  options: AssessmentOption[];
  helperText?: string;
}

const LETTER_OPTIONS_Q1: AssessmentOption[] = [
  { value: 'a', label: '<1 month' },
  { value: 'b', label: '1-3 months' },
  { value: 'c', label: '3-12 months' },
  { value: 'd', label: 'Indefinitely (passive income covers it)' },
];

const LETTER_OPTIONS_Q2: AssessmentOption[] = [
  { value: 'a', label: 'No budget' },
  { value: 'b', label: 'Rough mental tally' },
  { value: 'c', label: 'Written budget' },
  { value: 'd', label: 'Zero-based budget' },
];

const LETTER_OPTIONS_Q3: AssessmentOption[] = [
  { value: 'a', label: 'Not tracked' },
  { value: 'b', label: '>15% of income' },
  { value: 'c', label: '<15% of income and reducing' },
  { value: 'd', label: 'Zero consumer debt' },
];

const LETTER_OPTIONS_Q4: AssessmentOption[] = [
  { value: 'a', label: 'None in place' },
  { value: 'b', label: 'Partial cover' },
  { value: 'c', label: '6+ months in place' },
  { value: 'd', label: 'In place plus passive income' },
];

const LETTER_OPTIONS_Q5: AssessmentOption[] = [
  { value: 'a', label: '<10%' },
  { value: 'b', label: '10-30%' },
  { value: 'c', label: '30-60%' },
  { value: 'd', label: '>60%' },
];

const LETTER_OPTIONS_Q6: AssessmentOption[] = [
  { value: 'a', label: 'No will' },
  { value: 'b', label: 'Will >5 years old' },
  { value: 'c', label: 'Will <5 years old' },
  { value: 'd', label: 'Reviewed in the last 12 months' },
];

const LETTER_OPTIONS_Q7: AssessmentOption[] = [
  { value: 'a', label: 'No TFSA' },
  { value: 'b', label: 'Irregular contributions' },
  { value: 'c', label: 'Consistent, below the annual cap' },
  { value: 'd', label: 'Maxed for the couple' },
];

const LETTER_OPTIONS_Q8: AssessmentOption[] = [
  { value: 'a', label: 'None' },
  { value: 'b', label: 'Employer contribution only' },
  { value: 'c', label: 'Partial top-up' },
  { value: 'd', label: 'Optimised to the 27.5% / R350k cap' },
];

const LETTER_OPTIONS_Q9: AssessmentOption[] = [
  { value: 'a', label: '>3 years ago' },
  { value: 'b', label: '2-3 years ago' },
  { value: 'c', label: '1-2 years ago' },
  { value: 'd', label: '<12 months ago' },
];

const LETTER_OPTIONS_Q10: AssessmentOption[] = [
  { value: 'a', label: 'Never' },
  { value: 'b', label: '>5 years ago' },
  { value: 'c', label: '1-2 years ago' },
  { value: 'd', label: 'Annually' },
];

const Q1: AssessmentQuestion = {
  code: 'q1',
  prompt: 'If both earners stopped today, how long could you maintain your current lifestyle?',
  options: LETTER_OPTIONS_Q1,
};

const Q2: AssessmentQuestion = {
  code: 'q2',
  prompt: 'How is your household budget structured?',
  options: LETTER_OPTIONS_Q2,
};

const Q3: AssessmentQuestion = {
  code: 'q3',
  prompt: 'State of your consumer debt (credit cards, store accounts, personal loans)?',
  options: LETTER_OPTIONS_Q3,
};

const Q4: AssessmentQuestion = {
  code: 'q4',
  prompt: '6+ months of income protection (insurance + cash reserves)?',
  options: LETTER_OPTIONS_Q4,
};

const Q5: AssessmentQuestion = {
  code: 'q5',
  prompt:
    'What percentage of your net worth is income-generating (excluding home, cars and contents)?',
  options: LETTER_OPTIONS_Q5,
};

const Q6: AssessmentQuestion = {
  code: 'q6',
  prompt: 'What is the status of your will?',
  options: LETTER_OPTIONS_Q6,
};

const Q7: AssessmentQuestion = {
  code: 'q7',
  prompt: 'How are you using your tax-free savings account (TFSA)?',
  options: LETTER_OPTIONS_Q7,
};

const Q8: AssessmentQuestion = {
  code: 'q8',
  prompt: 'Section 11F retirement contribution (27.5% of income, capped at R350,000)?',
  options: LETTER_OPTIONS_Q8,
};

const Q9: AssessmentQuestion = {
  code: 'q9',
  prompt: 'When did you last review your insurance cover (life, disability, income protection)?',
  options: LETTER_OPTIONS_Q9,
};

const Q10: AssessmentQuestion = {
  code: 'q10',
  prompt: 'When did you last produce a Net Worth Statement?',
  options: LETTER_OPTIONS_Q10,
};

export const QUESTIONS_5Q: AssessmentQuestion[] = [Q1, Q2, Q3, Q4, Q5];

export const QUESTIONS_10Q: AssessmentQuestion[] = [Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10];

const GAP_OPTIONS: AssessmentOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'partially', label: 'Partially' },
  { value: 'no', label: 'No' },
];

export const QUESTIONS_GAP: AssessmentQuestion[] = [
  { code: 'q1', prompt: 'Current will signed within the last 3 years', options: GAP_OPTIONS },
  {
    code: 'q2',
    prompt: 'Known monthly surplus to within R5,000 accuracy',
    options: GAP_OPTIONS,
  },
  {
    code: 'q3',
    prompt: 'Monthly Money Conversation in the last 30 days',
    options: GAP_OPTIONS,
  },
  {
    code: 'q4',
    prompt: 'Emergency fund equal to 3-6 months of expenses',
    options: GAP_OPTIONS,
  },
  {
    code: 'q5',
    prompt: 'Life cover sized for debt + 10-15 years of income replacement',
    options: GAP_OPTIONS,
  },
  {
    code: 'q6',
    prompt: 'Income protection (monthly benefit) in place',
    options: GAP_OPTIONS,
  },
  {
    code: 'q7',
    prompt: 'Short-term insurance reviewed in the last 12 months (with 2+ quotes)',
    options: GAP_OPTIONS,
  },
  {
    code: 'q8',
    prompt: 'TFSA maxed (R36,000 per person this tax year)',
    options: GAP_OPTIONS,
  },
  {
    code: 'q9',
    prompt: 'Section 11F retirement contribution optimised (27.5%)',
    options: GAP_OPTIONS,
  },
  {
    code: 'q10',
    prompt: 'Bucket 3 "Dream Fund" held in a separate, named account',
    options: GAP_OPTIONS,
  },
  {
    code: 'q11',
    prompt: 'Business owner: key-person and buy-and-sell cover current',
    helperText: 'Answer "Yes" if you are not a business owner.',
    options: GAP_OPTIONS,
  },
  {
    code: 'q12',
    prompt: 'Annual cover review with an advisor in the last 12 months',
    options: GAP_OPTIONS,
  },
];
