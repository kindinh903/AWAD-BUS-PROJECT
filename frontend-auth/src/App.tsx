import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicAuthRoute from './components/PublicAuthRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TripDetailsPage from './pages/TripDetailsPage';
import { useAuthInit } from './hooks/useAuthInit';

function App() {
  const { isInitialized } = useAuthInit();

  // Show nothing while initializing auth
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Initializing...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public pages */}
        <Route index element={<HomePage />} />

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
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        {/* Trip details */}
        <Route path="trips/:id" element={<TripDetailsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
