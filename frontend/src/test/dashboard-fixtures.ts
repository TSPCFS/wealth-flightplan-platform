import type {
  ActivityResponse,
  DashboardResponse,
  MilestonesResponse,
  ProgressResponse,
  RecommendationsResponse,
} from '../types/user.types';

export const populatedDashboard: DashboardResponse = {
  current_stage: 'Freedom',
  current_stage_details: {
    name: 'Freedom',
    description: 'Mostly debt-free; consistently investing 20%+ of income.',
    income_runway: '3-12 months',
    progress_to_next_stage_pct: 45,
    next_stage: 'Independence',
  },
  overall_progress: {
    framework_completion_pct: 35,
    steps_completed: 2,
    steps_total: 7,
    current_focus_step: '3',
    next_step: { step_number: '3', title: 'Money Matrix' },
  },
  recommended_actions: [
    {
      priority: 'high',
      title: 'Complete the Net Worth Statement (Appendix B)',
      reason: 'Foundation for Step 3 — Money Matrix.',
      action_url: '/worksheets/APP-B',
      estimated_time_minutes: 45,
      source: 'stage_gap',
    },
    {
      priority: 'medium',
      title: 'Refresh the Risk Cover Review',
      reason: 'Last review was over a year ago.',
      action_url: '/worksheets/APP-C',
      estimated_time_minutes: 20,
      source: 'stale_review',
    },
  ],
  recent_activity: [
    {
      event_type: 'assessment_submitted',
      title: 'Completed 10Q assessment — placed at Freedom',
      timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      link: '/assessments/results/abc-123',
    },
    {
      event_type: 'worksheet_submitted',
      title: 'Submitted Zero-Based Budget — 71/8/21 split',
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      link: '/worksheets/results/xyz-789',
    },
  ],
  upcoming_milestones: [
    {
      code: 'monthly_money_conversation',
      title: 'Monthly Money Conversation',
      due_date: '2026-05-31',
      category: 'review',
      urgency: 'soon',
    },
  ],
  quick_stats: {
    net_worth: 2600000,
    monthly_surplus: 5000,
    total_consumer_debt: 0,
    income_generating_pct: 46.2,
  },
};

export const emptyDashboard: DashboardResponse = {
  current_stage: null,
  current_stage_details: null,
  overall_progress: {
    framework_completion_pct: 0,
    steps_completed: 0,
    steps_total: 7,
    current_focus_step: null,
    next_step: null,
  },
  recommended_actions: [],
  recent_activity: [],
  upcoming_milestones: [],
  quick_stats: {
    net_worth: null,
    monthly_surplus: null,
    total_consumer_debt: null,
    income_generating_pct: null,
  },
};

export const progressFixture: ProgressResponse = {
  overall_completion_pct: 28,
  steps_completed: 2,
  steps_total: 7,
  current_focus_step: '3',
  steps: [
    {
      step_number: '1',
      title: 'Financial GPS',
      is_completed: true,
      completed_at: '2026-04-15T10:00:00Z',
      time_spent_minutes: 92,
    },
    {
      step_number: '2',
      title: 'Zero-Based Budget',
      is_completed: true,
      completed_at: '2026-04-20T15:30:00Z',
      time_spent_minutes: 110,
    },
    {
      step_number: '3',
      title: 'Money Matrix',
      is_completed: false,
      completed_at: null,
      time_spent_minutes: 0,
    },
  ],
};

export const recommendationsFixture: RecommendationsResponse = {
  current_stage: 'Freedom',
  immediate_actions: populatedDashboard.recommended_actions,
  reading_path: [
    { order: 1, step_number: '3', title: 'Money Matrix', status: 'next' },
    { order: 2, step_number: '4a', title: 'Risk Cover — Households', status: 'upcoming' },
  ],
  suggested_examples: [
    { example_code: 'WE-8', title: "Hennie's Net Worth", reason: "Illustrates Step 3's central question" },
  ],
  suggested_worksheets: [
    { worksheet_code: 'APP-B', title: 'Net Worth Statement', reason: 'Required for Step 3' },
  ],
};

export const activityFirstPage: ActivityResponse = {
  events: [
    {
      event_type: 'assessment_submitted',
      title: 'Completed 10Q — placed at Freedom',
      timestamp: '2026-05-12T10:30:00Z',
      link: '/assessments/results/a1',
    },
    {
      event_type: 'stage_changed',
      title: 'Moved from Momentum to Freedom',
      timestamp: '2026-05-12T10:31:00Z',
      details: { direction: 'up' },
    },
  ],
  next_cursor: 'cursor-2',
  has_more: true,
};

export const activitySecondPage: ActivityResponse = {
  events: [
    {
      event_type: 'worksheet_submitted',
      title: 'Submitted Zero-Based Budget',
      timestamp: '2026-04-10T10:30:00Z',
      link: '/worksheets/results/w1',
    },
  ],
  next_cursor: null,
  has_more: false,
};

export const milestonesFixture: MilestonesResponse = {
  achieved: [
    { code: 'first_assessment', title: 'First assessment completed', date: '2026-01-15T10:00:00Z' },
    { code: 'stage_progression', title: 'Moved from Foundation → Momentum', date: '2026-03-20T10:00:00Z' },
  ],
  upcoming: [
    {
      code: 'annual_cover_review',
      title: 'Annual cover review',
      due_date: '2026-12-15',
      category: 'review',
      urgency: 'upcoming',
    },
    {
      code: 'monthly_money_conversation',
      title: 'Monthly Money Conversation',
      due_date: '2026-05-25',
      category: 'review',
      urgency: 'overdue',
    },
  ],
};
