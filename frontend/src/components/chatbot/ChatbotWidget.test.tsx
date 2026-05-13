import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatbotWidget } from './ChatbotWidget';
import { AuthContext, type AuthContextType, type AuthStatus } from '../../context/AuthContext';

vi.mock('../../services/chatbot.service', () => ({
  CHATBOT_STARTER_GREETING: 'hi',
  chatbotService: {
    startConversation: vi.fn().mockResolvedValue({
      conversation_id: 'c1',
      created_at: '2026-05-13T00:00:00Z',
      last_message_at: '2026-05-13T00:00:00Z',
      summary: null,
      message_count: 0,
    }),
    sendMessage: vi.fn(),
    listConversations: vi.fn().mockResolvedValue([]),
    getConversation: vi.fn(),
    deleteConversation: vi.fn(),
    createLead: vi.fn(),
  },
}));

const buildContext = (status: AuthStatus): AuthContextType => ({
  user: {
    user_id: 'u1',
    email: 'ada@b.co',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email_verified: true,
    subscription_tier: 'free',
  },
  status,
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
});

const renderAt = (path: string, status: AuthStatus = 'authenticated') =>
  render(
    <AuthContext.Provider value={buildContext(status)}>
      <MemoryRouter initialEntries={[path]}>
        <ChatbotWidget />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('ChatbotWidget', () => {
  beforeEach(() => {
    // clearAllMocks (not resetAllMocks) so the chatbotService default impls
    // declared in the vi.mock factory survive.
    vi.clearAllMocks();
  });

  it('renders the launcher on a protected route when authenticated', () => {
    renderAt('/dashboard');
    expect(screen.getByTestId('chatbot-launcher')).toBeInTheDocument();
  });

  it('opens the panel when the launcher is clicked and closes via the X', async () => {
    renderAt('/dashboard');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('chatbot-launcher'));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /close chatbot/i }));
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides on /login', () => {
    renderAt('/login');
    expect(screen.queryByTestId('chatbot-launcher')).not.toBeInTheDocument();
  });

  it.each([
    ['/register'],
    ['/forgot-password'],
    ['/reset-password'],
    ['/verify-email'],
  ])('hides on %s (auth-route)', (path) => {
    renderAt(path);
    expect(screen.queryByTestId('chatbot-launcher')).not.toBeInTheDocument();
  });

  it('hides when the user is unauthenticated', () => {
    renderAt('/dashboard', 'unauthenticated');
    expect(screen.queryByTestId('chatbot-launcher')).not.toBeInTheDocument();
  });
});
