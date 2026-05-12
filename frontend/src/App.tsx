import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
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
import { AssessmentResultsPage } from './pages/AssessmentResultsPage';
import { AssessmentHistoryPage } from './pages/AssessmentHistoryPage';
import { FrameworkOverviewPage } from './pages/FrameworkOverviewPage';
import { StepDetailPage } from './pages/StepDetailPage';
import { ExamplesPage } from './pages/ExamplesPage';
import { ExampleDetailPage } from './pages/ExampleDetailPage';
import { CaseStudiesPage } from './pages/CaseStudiesPage';
import { CaseStudyDetailPage } from './pages/CaseStudyDetailPage';

const protect = (element: React.ReactNode) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <Router>
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

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
