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
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments"
            element={
              <ProtectedRoute>
                <AssessmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments/5q"
            element={
              <ProtectedRoute>
                <Assessment5QPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments/10q"
            element={
              <ProtectedRoute>
                <Assessment10QPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments/gap"
            element={
              <ProtectedRoute>
                <AssessmentGapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments/results/:id"
            element={
              <ProtectedRoute>
                <AssessmentResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments/history"
            element={
              <ProtectedRoute>
                <AssessmentHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
