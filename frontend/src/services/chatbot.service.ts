// Chatbot service. Thin wrapper over apiClient — keeps the widget code
// free of fetch/auth concerns. Contract pinned in docs/API_CONTRACT.md
// (Phase 7a). When `ANTHROPIC_API_KEY` is unset on the backend, the
// /messages endpoint still returns 201 with a friendly "not configured"
// stub reply, so the widget doesn't need to special-case that path.

import { apiClient } from './api';
import type {
  Conversation,
  ConversationDetail,
  Lead,
  LeadCreate,
  SendMessageResponse,
} from '../types/chatbot.types';

const STARTER_GREETING =
  "Hi 👋 I'm the **attooh!** assistant. I can answer questions about the Wealth FlightPlan™ framework, your stage, or your worksheets. What's on your mind?";

export interface ChatbotService {
  startConversation(): Promise<Conversation>;
  sendMessage(conversationId: string, content: string): Promise<SendMessageResponse>;
  listConversations(): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<ConversationDetail>;
  deleteConversation(conversationId: string): Promise<void>;
  createLead(payload: LeadCreate): Promise<Lead>;
}

export const chatbotService: ChatbotService = {
  startConversation() {
    return apiClient.startChatbotConversation();
  },

  sendMessage(conversationId, content) {
    return apiClient.sendChatbotMessage(conversationId, content);
  },

  async listConversations() {
    const res = await apiClient.listChatbotConversations();
    return res.conversations;
  },

  getConversation(conversationId) {
    return apiClient.getChatbotConversation(conversationId);
  },

  deleteConversation(conversationId) {
    return apiClient.deleteChatbotConversation(conversationId);
  },

  createLead(payload) {
    return apiClient.createChatbotLead(payload);
  },
};

export const CHATBOT_STARTER_GREETING = STARTER_GREETING;
