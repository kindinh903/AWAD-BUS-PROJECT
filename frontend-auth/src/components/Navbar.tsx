import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bus, LogOut, LayoutDashboard, Menu, X,
  MapPin, Truck, Tag, HelpCircle, Search
} from 'lucide-react';
import { tokenManager } from '../lib/tokenManager';
import { authAPI, authEvents } from '../lib/api';
import ThemeToggle from './ThemeToggle';

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavLink({ to, icon, label, isActive }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
        ${isActive
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isAuthenticated = !!tokenManager.getAccessToken();

  // Get user info
  const userInfo = localStorage.getItem('user');
  const user = userInfo ? JSON.parse(userInfo) : null;
  const userFromToken = tokenManager.getUserInfo();
  const username = user?.name || userFromToken?.email || 'User';
  const userRole = user?.role || userFromToken?.role || 'passenger';

  // Handle scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('[Navbar] Logout failed:', error);
    } finally {
      tokenManager.clearTokens();
      localStorage.removeItem('user');
      authEvents.emit('logout');
      navigate('/login');
    }
  };

  // Navigation categories
  const navCategories = [
    { to: '/routes', icon: <MapPin className="h-4 w-4" />, label: 'Routes' },
    { to: '/fleet', icon: <Truck className="h-4 w-4" />, label: 'Fleet' },
    { to: '/promotions', icon: <Tag className="h-4 w-4" />, label: 'Promotions' },
    { to: '/help', icon: <HelpCircle className="h-4 w-4" />, label: 'Help' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={`sticky top-0 z-50 bg-white dark:bg-slate-900 border-b dark:border-slate-700 transition-all duration-300
        ${scrolled ? 'shadow-lg' : 'shadow-sm'}`}
    >
      {/* Top bar with promo */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-1.5 text-sm">
        🎉 <span className="font-medium">Special Offer:</span> Use code <span className="font-bold">SAVE20</span> for 20% off your first booking!
      </div>

      <div className="container mx-auto px-4">
        {/* Main navbar */}
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-lg">
              <Bus className="h-6 w-6" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              BusBooking
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navCategories.map((cat) => (
              <NavLink
                key={cat.to}
                {...cat}
                isActive={isActive(cat.to)}
              />
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <Link
              to="/"
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Search Trips"
            >
              <Search className="h-5 w-5" />
            </Link>

            <ThemeToggle />

            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
                {/* User dropdown */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {username.split(' ')[0]}
                    </span>
                    <span className={`text-xs ${userRole === 'admin' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </span>
                  </div>
                </div>

                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden xl:inline">Dashboard</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t dark:border-gray-700 bg-white dark:bg-slate-900 py-4">
          <div className="container mx-auto px-4 space-y-2">
            {/* Category Links */}
            {navCategories.map((cat) => (
              <Link
                key={cat.to}
                to={cat.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                  ${isActive(cat.to)
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                {cat.icon}
                {cat.label}
              </Link>
            ))}

            <hr className="my-3 border-gray-200 dark:border-gray-700" />

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{username}</p>
                    <p className={`text-sm ${userRole === 'admin' ? 'text-red-600' : 'text-blue-600'}`}>
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </p>
                  </div>
                </div>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2 px-4">
                <Link
                  to="/login"
                  className="flex-1 py-3 text-center font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex-1 py-3 text-center font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
