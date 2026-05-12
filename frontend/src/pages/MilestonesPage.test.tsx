import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MilestonesPage } from './MilestonesPage';
import { milestonesFixture } from '../test/dashboard-fixtures';

vi.mock('../services/user.service', () => ({
  userService: { getMilestones: vi.fn() },
}));

import { userService } from '../services/user.service';

describe('MilestonesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders achieved + upcoming sections with correct urgency badges', async () => {
    vi.mocked(userService.getMilestones).mockResolvedValue(milestonesFixture);
    render(
      <MemoryRouter>
        <MilestonesPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('First assessment completed')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Achieved' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming' })).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    // "Upcoming" appears twice (heading + badge).
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThanOrEqual(2);
    const list = screen.getAllByRole('listitem');
    expect(list.length).toBeGreaterThanOrEqual(3);
  });
});
