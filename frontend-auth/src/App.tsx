import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicAuthRoute from './components/PublicAuthRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UserDashboardPage from './pages/UserDashboardPage';
import TripDetailsPage from './pages/TripDetailsPage';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailedPage from './pages/PaymentFailedPage';
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import TripOperationsPage from './pages/TripOperationsPage';
import BookingHistoryPage from './pages/BookingHistoryPage';
import RoutesPage from './pages/RoutesPage';
import FleetPage from './pages/FleetPage';
import PromotionsPage from './pages/PromotionsPage';
import HelpPage from './pages/HelpPage';
import { useAuthInit } from './hooks/useAuthInit';

function App() {
  const { isInitialized } = useAuthInit();

  // Show loading while initializing auth
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public pages */}
        <Route index element={<HomePage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="help" element={<HelpPage />} />

        {/* Auth pages - redirect to home if already authenticated */}
        <Route
          path="login"
          element={
            <PublicAuthRoute>
              <LoginPage />
            </PublicAuthRoute>
          }
        />
        <Route
          path="register"
          element={
            <PublicAuthRoute>
              <RegisterPage />
            </PublicAuthRoute>
          }
        />

        {/* Protected pages - redirect to login if not authenticated */}
        {/* User Dashboard - My Tickets & Bookings */}
        <Route
          path="my-tickets"
          element={
            <ProtectedRoute>
              <UserDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Booking History - protected, requires authentication */}
        <Route
          path="booking-history"
          element={
            <ProtectedRoute>
              <BookingHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Trip details */}
        <Route path="trips/:id" element={<TripDetailsPage />} />

        {/* Payment pages */}
        <Route path="payment/:bookingId" element={<PaymentPage />} />
        <Route path="payment/success" element={<PaymentSuccessPage />} />
        <Route path="payment/failed" element={<PaymentFailedPage />} />

        {/* Admin Analytics - protected, requires admin role */}
        <Route
          path="admin/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Users - protected, requires admin role */}
        <Route
          path="admin/users"
          element={
            <ProtectedRoute>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Trip Operations - protected, requires admin role */}
        <Route
          path="admin/trip-operations"
          element={
            <ProtectedRoute>
              <TripOperationsPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
