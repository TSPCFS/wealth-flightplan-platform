import React from 'react';

interface Props {
  onClick: () => void;
  pending?: boolean;
}

// Inline quick-reply rendered inside an assistant message whose metadata
// carries intent === "advisor_handoff". Visually a pill button so it reads
// as a "tap to respond" inline action rather than a separate message.
export const ChatbotLeadCTA: React.FC<Props> = ({ onClick, pending }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={pending}
    data-testid="chatbot-lead-cta"
    className="mt-3 inline-flex items-center font-lato text-xs font-bold uppercase tracking-[0.14em] bg-attooh-lime text-attooh-charcoal hover:bg-attooh-lime-hover hover:text-white px-4 py-2 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {pending ? 'Connecting…' : 'Yes, connect me with an attooh! advisor'}
  </button>
);
