import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LoadingProvider } from './context/LoadingContext';

// Layout
import AdminLayout from './components/layout/AdminLayout';
import LoadingSpinner from './components/common/LoadingSpinner';
import StartupLoadingScreen from './components/common/StartupLoadingScreen';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Citizen Portal Pages
import CitizenPortalPage from './pages/citizen/CitizenPortalPage';
import RegisterComplaintPage from './pages/citizen/RegisterComplaintPage';
import MyComplaintsPage from './pages/citizen/MyComplaintsPage';
import BookAppointmentPage from './pages/citizen/BookAppointmentPage';
import TrackAppointmentPage from './pages/citizen/TrackAppointmentPage';

// Admin CRM Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import SubadminDashboardPage from './pages/dashboard/SubadminDashboardPage';
import WardSecretaryPortalPage from './pages/dashboard/WardSecretaryPortalPage';
import PaguthiSeyalaalarDashboardPage from './pages/dashboard/PaguthiSeyalaalarDashboardPage';
import DistrictPage from './pages/district/DistrictPage';
import ConstituencyDetailPage from './pages/district/ConstituencyDetailPage';
import PaguthiDetailPage from './pages/district/PaguthiDetailPage';
import WardDetailPage from './pages/district/WardDetailPage';
import MembersPage from './pages/members/MembersPage';
import MemberDetailPage from './pages/members/MemberDetailPage';
import IssuesPage from './pages/issues/IssuesPage';
import IssueDetailPage from './pages/issues/IssueDetailPage';
import ComplaintsReportedPage from './pages/complaints/ComplaintsReportedPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import OfficersPage from './pages/officers/OfficersPage';
import AIContentGeneratorPage from './pages/ai/AIContentGeneratorPage';
import TVKAIBotPage from './pages/ai/TVKAIBotPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';

// Protected Route Component with Strict Role-Based Authorization (Update 3.C)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <StartupLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      // Prevent citizens, ordinary users, and other roles from accessing unauthorized routes by changing URLs manually
      if (user.role === 'paguthi_seyalaalar') {
        return <Navigate to="/paguthi-seyalaalar/dashboard" replace />;
      }
      if (['citizen', 'user'].includes(user.role)) {
        return <Navigate to="/citizen" replace />;
      }
      if (['ward_secretary', 'ward', 'ward_officer'].includes(user.role)) {
        return <Navigate to="/ward-secretary/dashboard" replace />;
      }
      if (user.role === 'subadmin') {
        return <Navigate to="/subadmin/dashboard" replace />;
      }
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return children;
};

// Root Redirect Component
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <StartupLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'paguthi_seyalaalar') return <Navigate to="/paguthi-seyalaalar/dashboard" replace />;
  if (user.role === 'subadmin') return <Navigate to="/subadmin/dashboard" replace />;
  if (['ward_secretary', 'ward', 'ward_officer'].includes(user.role)) return <Navigate to="/ward-secretary/dashboard" replace />;
  if (['citizen', 'user'].includes(user.role)) return <Navigate to="/citizen" replace />;
  return <Navigate to="/admin/dashboard" replace />;
};

// Main App Routing Content (renders full-screen white startup screen with real 0%-100% progress)
const AppContent = () => {
  const { user, loading } = useAuth();
  const [startupComplete, setStartupComplete] = useState(false);

  return (
    <>
      {!startupComplete && (
        <StartupLoadingScreen
          isReady={!loading}
          onComplete={() => setStartupComplete(true)}
        />
      )}
      {startupComplete && (
        <Routes>
          {/* Root Route Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public Authentication Routes (redirect to correct dashboard if already logged in) */}
          <Route path="/login" element={user ? <RootRedirect /> : <LoginPage />} />
          <Route path="/signup" element={user ? <RootRedirect /> : <SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Citizen Service Portal Routes */}
          <Route path="/citizen" element={<CitizenPortalPage />} />
          <Route path="/citizen/register-complaint" element={<RegisterComplaintPage />} />
          <Route path="/citizen/my-complaints" element={<MyComplaintsPage />} />
          <Route path="/citizen/book-appointment" element={<BookAppointmentPage />} />
          <Route path="/citizen/track-appointment" element={<TrackAppointmentPage />} />

            {/* Subadmin Dedicated Portal */}
            <Route
              path="/subadmin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['subadmin', 'superadmin', 'district_admin']}>
                  <SubadminDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Ward Secretary Dedicated Portal (Reference: https://ward-member.vercel.app/) */}
            <Route
              path="/ward-secretary/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ward_secretary', 'ward', 'ward_officer', 'superadmin', 'district_admin']}>
                  <WardSecretaryPortalPage />
                </ProtectedRoute>
              }
            />
            <Route path="/ward-member" element={<Navigate to="/ward-secretary/dashboard" replace />} />

            {/* Paguthi Seyalaalar Portal */}
            <Route
              path="/paguthi-seyalaalar/dashboard"
              element={
                <ProtectedRoute allowedRoles={['paguthi_seyalaalar', 'superadmin', 'district_admin']}>
                  <PaguthiSeyalaalarDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/paguthi-dashboard" element={<Navigate to="/paguthi-seyalaalar/dashboard" replace />} />

            {/* Reference URL Aliases */}
            <Route path="/home" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/members" element={<Navigate to="/admin/members" replace />} />
            <Route path="/issues" element={<Navigate to="/admin/issues" replace />} />
            <Route path="/complaints-reported" element={<Navigate to="/admin/complaints-reported" replace />} />
            <Route path="/ward-dashboard" element={<Navigate to="/admin/district" replace />} />

            {/* Authenticated Admin CRM Layout & Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'district_admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* District, Constituencies, Paguthis & Wards */}
              <Route path="district" element={<DistrictPage />} />
              <Route path="district/constituencies/:id" element={<ConstituencyDetailPage />} />
              <Route path="district/constituencies/:id/paguthi/:paguthiName" element={<PaguthiDetailPage />} />
              <Route path="district/wards/:id" element={<WardDetailPage />} />

              {/* Members */}
              <Route path="members" element={<MembersPage />} />
              <Route path="members/:id" element={<MemberDetailPage />} />

              {/* Grievances / Issues */}
              <Route path="issues" element={<IssuesPage />} />
              <Route path="issues/:id" element={<IssueDetailPage />} />
              <Route path="complaints-reported" element={<ComplaintsReportedPage />} />

              {/* Analytics */}
              <Route path="analytics" element={<AnalyticsPage />} />

              {/* Projects */}
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />

              {/* Department Officers */}
              <Route path="officers" element={<OfficersPage />} />

              {/* AI Tools */}
              <Route path="ai-content" element={<AIContentGeneratorPage />} />
              <Route path="tvk-bot" element={<TVKAIBotPage />} />

              {/* Reports & Settings */}
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </>
    );
  };

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <LoadingProvider>
            <AppContent />
          </LoadingProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
