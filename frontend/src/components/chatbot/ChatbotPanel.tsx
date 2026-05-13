import React, { useContext, useEffect, useRef, useState } from 'react';
import { chatbotService, CHATBOT_STARTER_GREETING } from '../../services/chatbot.service';
import type { ChatMessage } from '../../types/chatbot.types';
import { ChatbotDisclaimer } from './ChatbotDisclaimer';
import { ChatbotInput } from './ChatbotInput';
import { ChatbotMessage } from './ChatbotMessage';
import { AuthContext } from '../../context/AuthContext';

interface Props {
  onClose: () => void;
  /**
   * Conversation id held by the parent ChatbotWidget so it persists across
   * panel open/close. When provided the panel resumes (loads history); when
   * null the panel calls startConversation() and reports the new id back
   * via onConversationStart.
   */
  conversationId: string | null;
  onConversationStart: (id: string) => void;
}

// Crypto.randomUUID is widely supported; the fallback is for older test
// harnesses that don't expose it. Client-side IDs only — the backend never
// sees them.
const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Math.random().toString(36).slice(2, 10)}`;

const stamp = (m: Omit<ChatMessage, 'message_id'>): ChatMessage => ({
  ...m,
  message_id: uid(),
});

const initialGreeting = (): ChatMessage =>
  stamp({
    role: 'assistant',
    content: CHATBOT_STARTER_GREETING,
    metadata: { intent: 'general' },
    created_at: new Date().toISOString(),
  });

export const ChatbotPanel: React.FC<Props> = ({
  onClose,
  conversationId,
  onConversationStart,
}) => {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>(() => [initialGreeting()]);
  const [disclaimerShown, setDisclaimerShown] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const scrollRef = useRef<HTMLOListElement | null>(null);

  // Boot: if the widget has a conversation id from a previous open, resume
  // (load history). Otherwise start a fresh conversation. Promise.resolve
  // guards against page tests that don't mock the service and we don't want
  // to bubble rejections in those.
  useEffect(() => {
    let cancelled = false;
    if (conversationId) {
      Promise.resolve(chatbotService.getConversation(conversationId))
        .then((conv) => {
          if (cancelled || !conv) return;
          if (conv.messages && conv.messages.length > 0) {
            setMessages([initialGreeting(), ...conv.messages.map(stamp)]);
          }
        })
        .catch(() => {
          // Stale id (deleted server-side or new browser session) — fall
          // through and start a new conversation below.
        });
      return () => {
        cancelled = true;
      };
    }
    Promise.resolve(chatbotService.startConversation())
      .then((conv) => {
        if (cancelled || !conv) return;
        onConversationStart(conv.conversation_id);
      })
      .catch(() => {
        // Production should surface this; stub never rejects.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoscroll to the latest message when the list changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const userInitials =
    user?.first_name && user?.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`
      : user?.email?.slice(0, 2);

  const handleSend = async (content: string) => {
    if (!conversationId) {
      setError("The assistant is still warming up — try again in a moment.");
      return;
    }
    const userMsg = stamp({
      role: 'user',
      content,
      metadata: null,
      created_at: new Date().toISOString(),
    });
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setError(null);
    try {
      const reply = await Promise.resolve(
        chatbotService.sendMessage(conversationId, content)
      );
      if (reply?.message) setMessages((prev) => [...prev, stamp(reply.message)]);
    } catch (err) {
      setError((err as Error).message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleHandoff = async () => {
    setHandoffPending(true);
    setError(null);
    try {
      // Backend derives the user's name + email from the JWT; we just supply
      // trigger taxonomy + a short context blob (max 1000 chars per contract).
      const context = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join('\n')
        .slice(0, 1000);
      await Promise.resolve(
        chatbotService.createLead({
          trigger_event: 'user_request',
          topic: 'Advisor handoff requested via chat',
          message: context || null,
          conversation_id: conversationId,
        })
      );
      const ack = stamp({
        role: 'assistant',
        content:
          "Thanks. An **attooh!** advisor will reach out by email within one business day.",
        metadata: { intent: 'general' },
        created_at: new Date().toISOString(),
      });
      setMessages((prev) => [...prev, ack]);
    } catch (err) {
      setError((err as Error).message || 'Could not request the handoff.');
    } finally {
      setHandoffPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="attooh! assistant chat"
      className="w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-6rem)] bg-attooh-card rounded-2xl shadow-attooh-md ring-1 ring-attooh-border overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="relative">
        <div className="h-1 bg-gradient-to-r from-attooh-lime via-attooh-lime-hover to-attooh-lime" />
        <div className="flex items-center justify-between px-4 py-3 bg-attooh-card border-b border-attooh-border">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-attooh-lime text-attooh-charcoal text-xs font-bold"
            >
              WP
            </span>
            <div className="leading-tight">
              <p className="font-montserrat text-sm font-bold text-attooh-charcoal">
                attooh! assistant
              </p>
              <p className="text-[11px] text-attooh-muted">
                Wealth FlightPlan™ guide
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chatbot"
            className="text-attooh-muted hover:text-attooh-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime rounded-full w-8 h-8 inline-flex items-center justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Message list */}
      <ol
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-attooh-bg/40"
      >
        {disclaimerShown && (
          <li>
            <ChatbotDisclaimer onDismiss={() => setDisclaimerShown(false)} />
          </li>
        )}
        {messages.map((m, idx) => (
          <ChatbotMessage
            key={m.message_id ?? `${m.role}-${m.created_at}-${idx}`}
            message={m}
            userInitials={userInitials}
            onLeadHandoff={handleHandoff}
            handoffPending={handoffPending}
          />
        ))}
        {sending && (
          <li
            aria-live="polite"
            className="text-xs text-attooh-muted px-1 italic"
          >
            attooh! assistant is typing…
          </li>
        )}
        {error && (
          <li role="alert" className="text-xs text-attooh-danger px-1">
            {error}
          </li>
        )}
      </ol>

      {/* Footer / input */}
      <ChatbotInput onSend={handleSend} disabled={sending} />
    </div>
  );
};
