import { Link, useNavigate } from 'react-router-dom';
import { Bus, LogOut, LayoutDashboard, User } from 'lucide-react';
import { tokenManager } from '../lib/tokenManager';
import { authAPI, authEvents } from '../lib/api';

export default function Navbar() {
  const navigate = useNavigate();
  const isAuthenticated = !!tokenManager.getAccessToken();

  // Get user info from localStorage or token
  const userInfo = localStorage.getItem('user');
  const user = userInfo ? JSON.parse(userInfo) : null;
  const userFromToken = tokenManager.getUserInfo();
  const username = user?.name || userFromToken?.email || 'User';
  const userRole = user?.role || userFromToken?.role || 'passenger';

  const handleLogout = async () => {
    try {
      // Call logout endpoint to invalidate refresh token on server
      console.log('[Navbar] Logging out...');
      await authAPI.logout();
    } catch (error) {
      console.error('[Navbar] Logout request failed:', error);
    } finally {
      // Clear local tokens regardless
      tokenManager.clearTokens();
      localStorage.removeItem('user');
      authEvents.emit('logout');
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl text-primary-600"
          >
            <Bus className="h-6 w-6" />
            Bus Booking
          </Link>

          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="h-4 w-4" />
                  <span>
                    Welcome,{' '}
                    <span className="font-semibold">
                      {username.split(' ')[0]}
                    </span>
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      userRole === 'admin'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {userRole.toUpperCase()}
                  </span>
                </div>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 text-gray-700 hover:text-primary-600"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-700 hover:text-primary-600"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-600"
                >
                  Login
                </Link>
                <Link to="/register" className="btn-primary px-4 py-2 text-sm">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
