// TODO — Stub. Replace with real fetch via apiClient once the chatbot
// endpoints land (see docs/API_CONTRACT.md). The exported interface here
// mirrors the contract being built in parallel so swapping is a one-shot
// edit per method.

import type {
  ChatMessage,
  Conversation,
  ConversationDetail,
  Lead,
  LeadCreate,
} from '../types/chatbot.types';

const NOW = () => new Date().toISOString();

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `stub-${Math.random().toString(36).slice(2, 10)}`;

const STARTER_GREETING =
  "Hi 👋 I'm the **attooh!** assistant. I can answer questions about the Wealth FlightPlan™ framework, your stage, or your worksheets. What's on your mind?";

const cannedAssistantReply = (userContent: string): ChatMessage => {
  const lower = userContent.toLowerCase();

  // If the user asks for human help, surface the advisor_handoff intent so the
  // UI renders the inline CTA.
  if (/advisor|human|consult|book|appointment/i.test(userContent)) {
    return {
      message_id: uid(),
      conversation_id: 'stub-conversation',
      role: 'assistant',
      content:
        "I can connect you with an **attooh!** advisor who can walk through your numbers with you. Want me to set that up?",
      metadata: { intent: 'advisor_handoff' },
      created_at: NOW(),
    };
  }

  if (/stage|placement|where am i/i.test(lower)) {
    return {
      message_id: uid(),
      conversation_id: 'stub-conversation',
      role: 'assistant',
      content:
        "Your stage comes from the 5- or 10-question assessment. You can take one from the **Assessments** page; the result feeds the dashboard and your recommendations.",
      metadata: { intent: 'recommendation' },
      created_at: NOW(),
    };
  }

  return {
    message_id: uid(),
    conversation_id: 'stub-conversation',
    role: 'assistant',
    content:
      "I'm a stub for now — the real assistant is on its way. Once the backend lands I'll be able to reason over your worksheets and stage data.",
    metadata: { intent: 'general' },
    created_at: NOW(),
  };
};

export interface ChatbotService {
  startConversation(): Promise<Conversation>;
  sendMessage(conversationId: string, content: string): Promise<ChatMessage>;
  listConversations(): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<ConversationDetail>;
  deleteConversation(conversationId: string): Promise<void>;
  createLead(payload: LeadCreate): Promise<Lead>;
}

export const chatbotService: ChatbotService = {
  async startConversation() {
    const conv: Conversation = {
      conversation_id: uid(),
      title: 'New conversation',
      created_at: NOW(),
      updated_at: NOW(),
    };
    return conv;
  },

  async sendMessage(_conversationId, content) {
    // The widget renders the user's own bubble optimistically; the stub only
    // returns the assistant's reply (matching the real API shape).
    void _conversationId;
    return cannedAssistantReply(content);
  },

  async listConversations() {
    return [];
  },

  async getConversation(conversationId) {
    return {
      conversation_id: conversationId,
      title: 'New conversation',
      created_at: NOW(),
      updated_at: NOW(),
      messages: [
        {
          message_id: uid(),
          conversation_id: conversationId,
          role: 'assistant',
          content: STARTER_GREETING,
          metadata: { intent: 'general' },
          created_at: NOW(),
        },
      ],
    };
  },

  async deleteConversation(_conversationId) {
    void _conversationId;
  },

  async createLead(payload) {
    return {
      lead_id: uid(),
      conversation_id: payload.conversation_id ?? null,
      created_at: NOW(),
    };
  },
};

export const CHATBOT_STARTER_GREETING = STARTER_GREETING;
