import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatbotMessage } from './ChatbotMessage';
import type { ChatMessage } from '../../types/chatbot.types';

const baseUser: ChatMessage = {
  message_id: 'u1',
  conversation_id: 'c1',
  role: 'user',
  content: 'What is my stage?',
  metadata: null,
  created_at: '2026-05-13T10:00:00Z',
};

const baseAssistant: ChatMessage = {
  message_id: 'a1',
  conversation_id: 'c1',
  role: 'assistant',
  content: 'Take the **5-question** assessment to find out.',
  metadata: { intent: 'general' },
  created_at: '2026-05-13T10:00:01Z',
};

describe('ChatbotMessage', () => {
  it('renders user bubbles right-aligned with the charcoal background', () => {
    render(<ChatbotMessage message={baseUser} userInitials="AL" />);
    const item = screen.getByTestId('chatbot-message-user');
    expect(item.className).toContain('justify-end');
    // The bubble inside should carry the charcoal background tone.
    const bubble = item.querySelector('div');
    expect(bubble?.className).toMatch(/bg-attooh-charcoal/);
    expect(screen.getByText('What is my stage?')).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('renders assistant bubbles left-aligned with the lime-pale background and markdown', () => {
    render(<ChatbotMessage message={baseAssistant} />);
    const item = screen.getByTestId('chatbot-message-assistant');
    expect(item.className).toContain('justify-start');
    const bubble = item.querySelector('div');
    expect(bubble?.className).toMatch(/bg-attooh-lime-pale/);
    // Markdown bold parses to <strong>
    expect(item.querySelector('strong')?.textContent).toBe('5-question');
    // WP avatar shows
    expect(screen.getByText('WP')).toBeInTheDocument();
  });

  it('renders the advisor-handoff CTA on the matching intent', () => {
    const onLead = vi.fn();
    render(
      <ChatbotMessage
        message={{
          ...baseAssistant,
          content: 'Want me to connect you with someone?',
          metadata: { intent: 'advisor_handoff' },
        }}
        onLeadHandoff={onLead}
      />
    );
    expect(screen.getByTestId('chatbot-lead-cta')).toBeInTheDocument();
  });

  it('does NOT render the CTA on the general intent', () => {
    render(<ChatbotMessage message={baseAssistant} onLeadHandoff={vi.fn()} />);
    expect(screen.queryByTestId('chatbot-lead-cta')).not.toBeInTheDocument();
  });
});
