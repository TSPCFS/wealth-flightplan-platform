// Chatbot domain types. Shape matches the backend contract pinned in
// docs/API_CONTRACT.md (Phase 7a). The backend's MessageOut returns
// {role, content, created_at, metadata} — no per-message id and no
// conversation_id (the id lives on the Conversation envelope). We keep
// message_id / conversation_id as optional client-side fields so the
// widget can stamp local placeholders before the server round-trip.

export type ChatRole = 'user' | 'assistant' | 'system';

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
  /**
   * Client-side stable id. Backend MessageOut does NOT include this;
   * the widget generates a UUID at render time so React keys are stable.
   */
  message_id?: string;
  /**
   * Convenience reference to the parent conversation; not returned by the
   * backend per-message but stamped by the widget so renderers can group.
   */
  conversation_id?: string;
  role: ChatRole;
  content: string;
  metadata?: ChatMessageMetadata | null;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  created_at: string;
  last_message_at: string;
  summary: string | null;
  message_count: number;
}

export interface ConversationListResponse {
  conversations: Conversation[];
}

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface SendMessageResponse {
  conversation_id: string;
  message: ChatMessage;
}

/**
 * Lead trigger taxonomy mirrors backend's `LeadTriggerEvent`. The widget's
 * inline "Yes, connect me" CTA fires with `user_request`. Future post-
 * completion triggers (worksheet/calculator/step) fire with their own value.
 */
export type LeadTriggerEvent =
  | 'worksheet_complete'
  | 'calculator_complete'
  | 'regulated_question'
  | 'user_request'
  | 'step_complete';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';

export interface LeadCreate {
  trigger_event: LeadTriggerEvent;
  topic?: string | null;
  message?: string | null;
  conversation_id?: string | null;
}

export interface Lead {
  lead_id: string;
  status: LeadStatus;
  created_at: string;
}
