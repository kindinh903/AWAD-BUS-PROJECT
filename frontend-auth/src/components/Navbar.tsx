import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import HelpIcon from '@mui/icons-material/Help';
import SearchIcon from '@mui/icons-material/Search';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
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
  const [showPromoBanner, setShowPromoBanner] = useState(() => {
    const hiddenUntil = localStorage.getItem('hidePromoBannerUntil');
    if (!hiddenUntil) return true;
    
    // Show banner again if 24 hours have passed
    const hiddenTime = parseInt(hiddenUntil);
    return Date.now() > hiddenTime;
  });
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

  const handleCloseBanner = () => {
    setShowPromoBanner(false);
    // Hide for 24 hours (86400000 milliseconds)
    const hideUntil = Date.now() + (24 * 60 * 60 * 1000);
    localStorage.setItem('hidePromoBannerUntil', hideUntil.toString());
  };

  // Navigation categories
  const navCategories = [
    { to: '/routes', icon: <LocationOnIcon sx={{ fontSize: 16 }} />, label: 'Routes' },
    { to: '/fleet', icon: <LocalShippingIcon sx={{ fontSize: 16 }} />, label: 'Fleet' },
    { to: '/promotions', icon: <LocalOfferIcon sx={{ fontSize: 16 }} />, label: 'Promotions' },
    { to: '/help', icon: <HelpIcon sx={{ fontSize: 16 }} />, label: 'Help' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={`sticky top-0 z-50 bg-white dark:bg-slate-900 border-b dark:border-slate-700 transition-all duration-300
        ${scrolled ? 'shadow-lg' : 'shadow-sm'}`}
    >
      {/* Top bar with promo */}
      {showPromoBanner && (
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-1.5 text-sm">
          <div className="container mx-auto px-4 flex items-center justify-center">
            <span>
              🎉 <span className="font-medium">Special Offer:</span> Use code <span className="font-bold">SAVE20</span> for 20% off your first booking!
            </span>
            <button
              onClick={handleCloseBanner}
              className="absolute right-4 p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Close banner"
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        {/* Main navbar */}
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-lg">
              <DirectionsBusIcon sx={{ fontSize: 24 }} />
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
              <SearchIcon sx={{ fontSize: 20 }} />
            </Link>

            <ThemeToggle />

            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3 ml-2">
                {/* User dropdown */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {username.split(' ')[0]}
                    </span>
                  </div>
                </div>

                {/* My Tickets for regular users, Dashboard for admin */}
                {userRole === 'admin' ? (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <DashboardIcon sx={{ fontSize: 16 }} />
                    <span className="hidden xl:inline">Admin</span>
                  </Link>
                ) : (
                  <Link
                    to="/my-tickets"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ConfirmationNumberIcon sx={{ fontSize: 16 }} />
                    <span className="hidden xl:inline">My Tickets</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogoutIcon sx={{ fontSize: 16 }} />
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
              {mobileMenuOpen ? <CloseIcon sx={{ fontSize: 24 }} /> : <MenuIcon sx={{ fontSize: 24 }} />}
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
                  </div>
                </div>
                {/* My Tickets for regular users, Dashboard for admin */}
                {userRole === 'admin' ? (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <DashboardIcon sx={{ fontSize: 20 }} />
                    Admin Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/my-tickets"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ConfirmationNumberIcon sx={{ fontSize: 20 }} />
                    My Tickets
                  </Link>
                )}
                <Link
                  to="/booking-history"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <DashboardIcon sx={{ fontSize: 20 }} />
                  Booking History
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogoutIcon sx={{ fontSize: 20 }} />
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
