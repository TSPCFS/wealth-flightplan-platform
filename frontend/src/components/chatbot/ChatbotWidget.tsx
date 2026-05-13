import React, { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ChatbotPanel } from './ChatbotPanel';

const AUTH_ROUTE_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

const isAuthRoute = (pathname: string): boolean =>
  AUTH_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// Floating chatbot launcher + expandable panel. Rendered through a portal at
// document.body so the widget sits above the page content but is unaffected
// by AppLayout's <main> container or its overflow rules. Hidden on auth
// routes and when the user isn't authenticated.
export const ChatbotWidget: React.FC = () => {
  // Read AuthContext directly so the widget can render under test renders that
  // don't wrap with AuthProvider (e.g. existing page tests). Missing provider
  // == unauthenticated, which hides the widget anyway.
  const auth = useContext(AuthContext);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // Held at the widget level so the conversation persists across panel
  // open/close within the same browser session. Cleared on logout (the whole
  // widget unmounts when auth.status flips away from "authenticated").
  const [conversationId, setConversationId] = useState<string | null>(null);

  if (!auth || auth.status !== 'authenticated') return null;
  if (isAuthRoute(location.pathname)) return null;
  if (typeof document === 'undefined') return null;

  const node = (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
      {open && (
        <div className="pointer-events-auto">
          <ChatbotPanel
            onClose={() => setOpen(false)}
            conversationId={conversationId}
            onConversationStart={setConversationId}
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close attooh! assistant' : 'Open attooh! assistant'}
        aria-expanded={open}
        data-testid="chatbot-launcher"
        className="pointer-events-auto w-14 h-14 rounded-full bg-attooh-lime hover:bg-attooh-lime-hover text-attooh-charcoal hover:text-white transition-colors shadow-attooh-md ring-1 ring-attooh-lime/40 inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-attooh-lime focus-visible:ring-offset-2"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>
    </div>
  );

  return createPortal(node, document.body);
};
