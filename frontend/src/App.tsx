import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Eager: auth flow + most-trafficked hub pages (no heavy deps).
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { Assessment5QPage } from './pages/Assessment5QPage';
import { Assessment10QPage } from './pages/Assessment10QPage';
import { AssessmentGapPage } from './pages/AssessmentGapPage';
import { FrameworkOverviewPage } from './pages/FrameworkOverviewPage';
import { ExamplesPage } from './pages/ExamplesPage';
import { CaseStudiesPage } from './pages/CaseStudiesPage';
import { WorksheetsCataloguePage } from './pages/WorksheetsCataloguePage';

// Lazy: heavy pages pulling Recharts and/or react-markdown.
// Recharts alone is ~400KB of the JS bundle; react-markdown adds ~100KB.
const StepDetailPage = lazy(() =>
  import('./pages/StepDetailPage').then((m) => ({ default: m.StepDetailPage }))
);
const ExampleDetailPage = lazy(() =>
  import('./pages/ExampleDetailPage').then((m) => ({ default: m.ExampleDetailPage }))
);
const CaseStudyDetailPage = lazy(() =>
  import('./pages/CaseStudyDetailPage').then((m) => ({ default: m.CaseStudyDetailPage }))
);
const AssessmentResultsPage = lazy(() =>
  import('./pages/AssessmentResultsPage').then((m) => ({ default: m.AssessmentResultsPage }))
);
const AssessmentHistoryPage = lazy(() =>
  import('./pages/AssessmentHistoryPage').then((m) => ({ default: m.AssessmentHistoryPage }))
);
const WorksheetFillPage = lazy(() =>
  import('./pages/WorksheetFillPage').then((m) => ({ default: m.WorksheetFillPage }))
);
const WorksheetResultsPage = lazy(() =>
  import('./pages/WorksheetResultsPage').then((m) => ({ default: m.WorksheetResultsPage }))
);
const WorksheetHistoryPage = lazy(() =>
  import('./pages/WorksheetHistoryPage').then((m) => ({ default: m.WorksheetHistoryPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const ProgressPage = lazy(() =>
  import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage }))
);
const RecommendationsPage = lazy(() =>
  import('./pages/RecommendationsPage').then((m) => ({ default: m.RecommendationsPage }))
);
const ActivityPage = lazy(() =>
  import('./pages/ActivityPage').then((m) => ({ default: m.ActivityPage }))
);
const MilestonesPage = lazy(() =>
  import('./pages/MilestonesPage').then((m) => ({ default: m.MilestonesPage }))
);

// Admin (Phase 8b). Lazy-loaded so non-admins never pay for the chunk on
// first paint. The ProtectedRoute requireAdmin gate hides them from
// non-admins; non-admins who type the URL directly redirect to /dashboard.
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminUsersPage = lazy(() =>
  import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminUserDetailPage = lazy(() =>
  import('./pages/admin/AdminUserDetailPage').then((m) => ({ default: m.AdminUserDetailPage }))
);
const AdminLeadsPage = lazy(() =>
  import('./pages/admin/AdminLeadsPage').then((m) => ({ default: m.AdminLeadsPage }))
);
const AdminAuditPage = lazy(() =>
  import('./pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage }))
);

const protect = (element: React.ReactNode) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

const protectAdmin = (element: React.ReactNode) => (
  <ProtectedRoute requireAdmin>{element}</ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={protect(<DashboardPage />)} />

            <Route path="/assessments" element={protect(<AssessmentsPage />)} />
            <Route path="/assessments/5q" element={protect(<Assessment5QPage />)} />
            <Route path="/assessments/10q" element={protect(<Assessment10QPage />)} />
            <Route path="/assessments/gap" element={protect(<AssessmentGapPage />)} />
            <Route path="/assessments/results/:id" element={protect(<AssessmentResultsPage />)} />
            <Route path="/assessments/history" element={protect(<AssessmentHistoryPage />)} />

            <Route path="/framework" element={protect(<FrameworkOverviewPage />)} />
            <Route path="/framework/:stepNumber" element={protect(<StepDetailPage />)} />

            <Route path="/examples" element={protect(<ExamplesPage />)} />
            <Route path="/examples/:exampleCode" element={protect(<ExampleDetailPage />)} />

            <Route path="/case-studies" element={protect(<CaseStudiesPage />)} />
            <Route path="/case-studies/:studyCode" element={protect(<CaseStudyDetailPage />)} />

            <Route path="/worksheets" element={protect(<WorksheetsCataloguePage />)} />
            <Route path="/worksheets/:code" element={protect(<WorksheetFillPage />)} />
            <Route path="/worksheets/:code/history" element={protect(<WorksheetHistoryPage />)} />
            <Route path="/worksheets/results/:id" element={protect(<WorksheetResultsPage />)} />

            <Route path="/profile" element={protect(<ProfilePage />)} />
            <Route path="/progress" element={protect(<ProgressPage />)} />
            <Route path="/recommendations" element={protect(<RecommendationsPage />)} />
            <Route path="/activity" element={protect(<ActivityPage />)} />
            <Route path="/milestones" element={protect(<MilestonesPage />)} />

            {/* Admin (Phase 8b) — gated by ProtectedRoute requireAdmin */}
            <Route path="/admin" element={protectAdmin(<AdminDashboardPage />)} />
            <Route path="/admin/users" element={protectAdmin(<AdminUsersPage />)} />
            <Route path="/admin/users/:userId" element={protectAdmin(<AdminUserDetailPage />)} />
            <Route path="/admin/leads" element={protectAdmin(<AdminLeadsPage />)} />
            <Route path="/admin/audit" element={protectAdmin(<AdminAuditPage />)} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
