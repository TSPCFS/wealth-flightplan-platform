import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatbotLeadCTA } from './ChatbotLeadCTA';

describe('ChatbotLeadCTA', () => {
  it('renders the inline advisor-handoff button and fires onClick', () => {
    const onClick = vi.fn();
    render(<ChatbotLeadCTA onClick={onClick} />);
    const btn = screen.getByTestId('chatbot-lead-cta');
    expect(btn).toHaveTextContent(/connect me with an attooh! advisor/i);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });

  it('shows a pending label and disables when pending', () => {
    render(<ChatbotLeadCTA onClick={vi.fn()} pending />);
    const btn = screen.getByTestId('chatbot-lead-cta');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/connecting/i);
  });
});
