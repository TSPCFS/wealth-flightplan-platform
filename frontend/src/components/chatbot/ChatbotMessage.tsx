import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types/chatbot.types';
import { ChatbotLeadCTA } from './ChatbotLeadCTA';

interface Props {
  message: ChatMessage;
  userInitials?: string;
  onLeadHandoff?: () => void;
  handoffPending?: boolean;
}

const Avatar: React.FC<{ role: ChatMessage['role']; initials?: string }> = ({
  role,
  initials,
}) => {
  if (role === 'assistant') {
    return (
      <span
        aria-hidden="true"
        className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-attooh-lime text-attooh-charcoal text-[10px] font-bold tracking-tight"
      >
        WP
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-attooh-charcoal text-white text-[10px] font-bold tracking-tight"
    >
      {(initials ?? 'YOU').slice(0, 2).toUpperCase()}
    </span>
  );
};

// Bubble styles share the same rounded shape; user is right-aligned charcoal,
// assistant is left-aligned lime-pale. We render markdown inside both so
// **bold** / lists / links from the backend come through cleanly.
export const ChatbotMessage: React.FC<Props> = ({
  message,
  userInitials,
  onLeadHandoff,
  handoffPending,
}) => {
  const isUser = message.role === 'user';
  const showHandoff =
    !isUser && message.metadata?.intent === 'advisor_handoff' && Boolean(onLeadHandoff);

  return (
    <li
      data-testid={`chatbot-message-${message.role}`}
      className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && <Avatar role="assistant" />}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-attooh-charcoal text-white rounded-br-sm'
            : 'bg-attooh-lime-pale text-attooh-charcoal rounded-bl-sm'
        }`}
      >
        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-strong:font-semibold">
          <ReactMarkdown
            components={{
              // Force links to open in a new tab — the chat is overlay UI.
              a: ({ node: _n, ...rest }) => (
                <a
                  {...rest}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={isUser ? 'underline text-attooh-lime-pale' : 'underline text-attooh-lime-hover'}
                />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {showHandoff && onLeadHandoff && (
          <ChatbotLeadCTA onClick={onLeadHandoff} pending={handoffPending} />
        )}
      </div>
      {isUser && <Avatar role="user" initials={userInitials} />}
    </li>
  );
};
