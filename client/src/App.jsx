import { Route, Routes, useLocation } from 'react-router-dom';
import { ContentProvider } from './content-store.jsx';
import { AuthProvider, RequireAuth } from './auth-store.jsx';
import Home from './pages/Home.jsx';
import Faq from './pages/Faq.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import AdminConsole from './pages/AdminConsole.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import Overview from './pages/dashboard/Overview.jsx';
import Plans from './pages/dashboard/Plans.jsx';
import PlanCheckout from './pages/dashboard/PlanCheckout.jsx';
import PlanDetail from './pages/dashboard/PlanDetail.jsx';
import Money from './pages/dashboard/Money.jsx';
import Transactions from './pages/dashboard/Transactions.jsx';
import Referrals from './pages/dashboard/Referrals.jsx';
import Settings from './pages/dashboard/Settings.jsx';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const location = useLocation();
  const isCheckout = location.pathname.startsWith('/checkout/');
  const isAdmin = location.pathname === '/admin';
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <ContentProvider>
      <AuthProvider>
        <div className={`shell${isCheckout ? ' checkout-shell-layout' : ''}${isAdmin ? ' admin-shell-layout' : ''}${isDashboard ? ' dashboard-shell-layout' : ''}`}>
          {!isCheckout && <Nav />}
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <DashboardLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<Overview />} />
                <Route path="plans" element={<Plans />} />
                <Route path="plan/:planName" element={<PlanDetail />} />
                <Route path="money" element={<Money />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="referrals" element={<Referrals />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route
                path="/checkout/:planId"
                element={
                  <RequireAuth>
                    <PlanCheckout />
                  </RequireAuth>
                }
              />

              <Route
                path="/admin"
                element={
                  <RequireAuth role="admin">
                    <AdminConsole />
                  </RequireAuth>
                }
              />

              <Route path="*" element={<div className="fatal">Page not found.</div>} />
            </Routes>
          </main>
          {!isCheckout && !isAdmin && !isDashboard && <Footer />}
        </div>
      </AuthProvider>
    </ContentProvider>
  );
}
