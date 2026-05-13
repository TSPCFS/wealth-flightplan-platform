import React, { useEffect, useRef, useState } from 'react';

const MAX_CHARS = 4000;
const WARN_AT = 3500;

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

// Auto-growing textarea + send button. Enter sends; Shift+Enter inserts a
// newline. The 4000-char cap mirrors the backend's per-message limit; a
// counter appears once the message passes 3500 chars so users get a heads-up
// before the cap.
export const ChatbotInput: React.FC<Props> = ({ onSend, disabled }) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Resize on every change. Resetting height to auto first ensures shrink
  // works too, not just grow.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_CHARS && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-attooh-border bg-attooh-card px-3 py-2.5"
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask the attooh! assistant…"
          rows={1}
          maxLength={MAX_CHARS}
          aria-label="Type a message"
          className="flex-1 resize-none rounded-lg border border-attooh-border bg-white px-3 py-2 text-sm text-attooh-charcoal placeholder:text-attooh-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime focus:border-attooh-lime-hover max-h-40"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-attooh-lime text-attooh-charcoal hover:bg-attooh-lime-hover hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime focus-visible:ring-offset-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      {value.length >= WARN_AT && (
        <p
          className="mt-1 text-[11px] text-attooh-muted text-right font-lato"
          aria-live="polite"
        >
          {value.length} / {MAX_CHARS}
        </p>
      )}
    </form>
  );
};
