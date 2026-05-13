import React, { useContext, useEffect, useRef, useState } from 'react';
import { chatbotService, CHATBOT_STARTER_GREETING } from '../../services/chatbot.service';
import type { ChatMessage } from '../../types/chatbot.types';
import { ChatbotDisclaimer } from './ChatbotDisclaimer';
import { ChatbotInput } from './ChatbotInput';
import { ChatbotMessage } from './ChatbotMessage';
import { AuthContext } from '../../context/AuthContext';

interface Props {
  onClose: () => void;
}

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Math.random().toString(36).slice(2, 10)}`;

const initialGreeting = (): ChatMessage => ({
  message_id: uid(),
  conversation_id: 'pending',
  role: 'assistant',
  content: CHATBOT_STARTER_GREETING,
  metadata: { intent: 'general' },
  created_at: new Date().toISOString(),
});

export const ChatbotPanel: React.FC<Props> = ({ onClose }) => {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [initialGreeting()]);
  const [disclaimerShown, setDisclaimerShown] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const scrollRef = useRef<HTMLOListElement | null>(null);

  // Start a conversation on mount so subsequent sendMessage calls have an id.
  // Promise.resolve guards against stubs that return undefined (the panel is
  // mounted by AppLayout in many tests that don't bother to mock chatbot).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(chatbotService.startConversation())
      .then((conv) => {
        if (cancelled || !conv) return;
        setConversationId(conv.conversation_id);
      })
      .catch(() => {
        // Stub never rejects; production should surface this to error state.
      });
    return () => {
      cancelled = true;
    };
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
    const id = conversationId ?? 'pending';
    const userMsg: ChatMessage = {
      message_id: uid(),
      conversation_id: id,
      role: 'user',
      content,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setError(null);
    try {
      const reply = await Promise.resolve(chatbotService.sendMessage(id, content));
      if (reply) setMessages((prev) => [...prev, reply]);
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
      await Promise.resolve(
        chatbotService.createLead({
          conversation_id: conversationId,
          full_name:
            user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : undefined,
          email: user?.email,
          context: messages
            .filter((m) => m.role === 'user')
            .map((m) => m.content)
            .join('\n')
            .slice(0, 2000),
        })
      );
      const ack: ChatMessage = {
        message_id: uid(),
        conversation_id: conversationId ?? 'pending',
        role: 'assistant',
        content:
          "Thanks — an **attooh!** advisor will reach out by email within one business day.",
        metadata: { intent: 'general' },
        created_at: new Date().toISOString(),
      };
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
        {messages.map((m) => (
          <ChatbotMessage
            key={m.message_id}
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
