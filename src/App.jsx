import React from 'react';
    import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
    import { Helmet } from 'react-helmet';

    // Pages
    import LandingPage from '@/pages/LandingPage';
    import LoginPage from '@/pages/LoginPage';
    import RegisterPage from '@/pages/RegisterPage';
    import PatientDashboard from '@/pages/PatientDashboard';
    import DoctorDashboard from '@/pages/DoctorDashboard';
    import AdminDashboard from '@/pages/AdminDashboard';
    import CaseSubmission from '@/pages/CaseSubmission';
    import ProposalView from '@/pages/ProposalView';
    import DoctorComparison from '@/pages/DoctorComparison';
    import AdminCaseForm from '@/pages/AdminCaseForm';
    import AdminUserProfile from '@/pages/AdminUserProfile';
    import AdminProposalEdit from '@/pages/AdminProposalEdit';
    import RevenueAnalytics from '@/pages/RevenueAnalytics';
    import AdminRevenueAnalytics from '@/pages/AdminRevenueAnalytics';
    import AdminIssues from '@/pages/AdminIssues';
    import ProfilePage from '@/pages/ProfilePage';
    import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
    import ResetPasswordPage from '@/pages/ResetPasswordPage';
    import AdminCaseProposals from '@/pages/AdminCaseProposals';
    import AdminFinance from '@/pages/AdminFinance';
    import Wallet from '@/pages/Wallet';
    import AdminSettings from '@/pages/AdminSettings';
    import ChatPage from '@/pages/ChatPage';
    import AdminReports from '@/pages/AdminReports';
    import AdminAddUser from '@/pages/AdminAddUser';
    import AdminAreaAnalytics from '@/pages/AdminAreaAnalytics';
    import AdminAppointments from '@/pages/AdminAppointments';
    import AdminHRManagement from '@/pages/AdminHRManagement';
    import AdminPayroll from '@/pages/AdminPayroll';
    import AdminAdvancedAnalytics from '@/pages/AdminAdvancedAnalytics';
    import AdminInvestment from '@/pages/AdminInvestment';
    import AdminEcommerce from '@/pages/AdminEcommerce';
    import DoctorShop from '@/pages/DoctorShop';
    import PatientShop from '@/pages/PatientShop';

    function App() {
      return (
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Helmet>
              <title>DentaLink Smart Matching System</title>
              <meta name="description" content="Connect patients with the best dental professionals through intelligent matching and comprehensive treatment proposals." />
            </Helmet>
            
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/patient/dashboard" element={<PatientDashboard />} />
              <Route path="/patient/wallet" element={<Wallet />} />
              <Route path="/patient/shop" element={<PatientShop />} />
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/revenue" element={<RevenueAnalytics />} />
              <Route path="/doctor/shop" element={<DoctorShop />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/revenue" element={<AdminRevenueAnalytics />} />
              <Route path="/admin/finance" element={<AdminFinance />} />
              <Route path="/admin/issues" element={<AdminIssues />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/add-user" element={<AdminAddUser />} />
              <Route path="/admin/area-analytics" element={<AdminAreaAnalytics />} />
              <Route path="/admin/appointments" element={<AdminAppointments />} />
              <Route path="/admin/hr" element={<AdminHRManagement />} />
              <Route path="/admin/payroll" element={<AdminPayroll />} />
              <Route path="/admin/advanced-analytics" element={<AdminAdvancedAnalytics />} />
              <Route path="/admin/investment" element={<AdminInvestment />} />
              <Route path="/admin/ecommerce" element={<AdminEcommerce />} />
              <Route path="/patient/submit-case" element={<CaseSubmission />} />
              <Route path="/patient/proposals/:caseId" element={<ProposalView />} />
              <Route path="/patient/compare/:caseId" element={<DoctorComparison />} />
              <Route path="/admin/case/new" element={<AdminCaseForm />} />
              <Route path="/admin/case/edit/:caseId" element={<AdminCaseForm />} />
              <Route path="/admin/case/:caseId/proposals" element={<AdminCaseProposals />} />
              <Route path="/admin/user/edit/:userId" element={<AdminUserProfile />} />
              <Route path="/admin/proposal/edit/:proposalId" element={<AdminProposalEdit />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/chat/:caseId" element={<ChatPage />} />
            </Routes>
          </div>
        </Router>
      );
    }

    export default App;