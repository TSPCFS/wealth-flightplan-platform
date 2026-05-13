// Chatbot domain types. Shape mirrors the backend contract being built in
// parallel — once docs/API_CONTRACT.md pins the schema, double-check field
// names here. Until then the values come from the stub fixtures.

export type ChatRole = 'user' | 'assistant';

// A handful of intent tags that the assistant message metadata may carry so
// the UI can render quick-replies / extra CTAs. Keep this open via the string
// fallback so backend additions don't break compilation.
export type ChatIntent = 'advisor_handoff' | 'recommendation' | 'general' | string;

export interface ChatMessageMetadata {
  intent?: ChatIntent;
  // Free-form additional metadata (token counts, citations, etc.). Open shape.
  [key: string]: unknown;
}

export interface ChatMessage {
  message_id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  metadata?: ChatMessageMetadata | null;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface LeadCreate {
  conversation_id?: string | null;
  full_name?: string;
  email?: string;
  phone?: string | null;
  context?: string | null;
}

export interface Lead {
  lead_id: string;
  conversation_id: string | null;
  created_at: string;
}
