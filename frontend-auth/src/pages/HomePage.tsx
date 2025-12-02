import { Link, useNavigate } from 'react-router-dom';
import { Shield, Bus, Clock, Award } from 'lucide-react';
import { tokenManager } from '../lib/tokenManager';
import { DemoAccounts } from '../components/DemoAccounts';
import { BusSearchForm, SearchData } from '../components/BusSearchForm';

export default function HomePage() {
  const navigate = useNavigate();
  const isAuthenticated = !!tokenManager.getAccessToken();

  // Get user info from localStorage
  const userInfo = localStorage.getItem('user');
  const user = userInfo ? JSON.parse(userInfo) : null;
  const username = user?.name || 'User';

  // Handle search submission
  const handleSearch = (searchData: SearchData) => {
    // Store search data in localStorage for dashboard access
    localStorage.setItem('busSearch', JSON.stringify(searchData));
    
    // Navigate to dashboard without page refresh
    navigate('/dashboard');
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="container-custom">
          <div className="max-w-3xl">
            {isAuthenticated ? (
              <>
                <h1 className="text-5xl font-bold mb-6">
                  Welcome back,{' '}
                  <span className="text-primary-200">{username}!</span>
                </h1>
                <p className="text-xl mb-8 text-primary-100">
                  Ready to book your next bus trip?
                </p>
                <Link
                  to="/dashboard"
                  className="btn bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg inline-block"
                >
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-5xl font-bold mb-6">
                  Welcome to Bus Booking
                </h1>
                <p className="text-xl mb-8 text-primary-100">
                  Fast, secure, and convenient bus booking platform
                </p>
                <div className="flex gap-4">
                  <Link
                    to="/login"
                    className="btn bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="btn border-2 border-white text-white hover:bg-white/10 px-8 py-4 text-lg"
                  >
                    Create Account
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <BusSearchForm onSearch={handleSearch} className="max-w-4xl mx-auto" />
        </div>
      </section>

      {/* Demo Accounts Section - Show only when not authenticated */}
      {!isAuthenticated && (
        <section className="py-16 bg-gray-50">
          <div className="container-custom">
            <DemoAccounts />
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-16">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Our Bus Booking Platform?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card p-6 text-center">
              <Bus className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Wide Network</h3>
              <p className="text-gray-600">
                Connect to over 50+ destinations across Vietnam with trusted operators
              </p>
            </div>
            <div className="card p-6 text-center">
              <Clock className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-Time Updates</h3>
              <p className="text-gray-600">
                Get instant booking confirmations and live bus tracking
              </p>
            </div>
            <div className="card p-6 text-center">
              <Shield className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
              <p className="text-gray-600">
                Industry-standard security for all transactions and refunds
              </p>
            </div>
            <div className="card p-6 text-center">
              <Award className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Best Prices</h3>
              <p className="text-gray-600">
                Compare prices from multiple operators and get the best deals
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
