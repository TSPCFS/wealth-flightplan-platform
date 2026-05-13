import React from 'react';

interface Props {
  onDismiss?: () => void;
}

// First-open banner. Lives at the top of the message list and persists for
// the lifetime of the conversation; the parent component decides whether to
// hide it after dismissal.
export const ChatbotDisclaimer: React.FC<Props> = ({ onDismiss }) => (
  <div
    role="note"
    className="bg-attooh-lime-pale border border-attooh-lime/40 rounded-lg px-3 py-2 text-[11px] leading-snug font-lato font-bold uppercase tracking-[0.12em] text-attooh-charcoal flex items-start gap-2"
  >
    <span className="flex-1">
      Illustrative. Not financial advice. Verify with a qualified attooh! advisor.
    </span>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss chatbot disclaimer"
        className="text-attooh-charcoal hover:text-attooh-lime-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime rounded"
      >
        <span aria-hidden="true">×</span>
      </button>
    )}
  </div>
);
