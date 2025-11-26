import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authAPI } from '../lib/api';
import { tokenManager } from '../lib/tokenManager';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { Loader2, Mail, Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const response = await authAPI.login(formData);

      // Store tokens - access token in memory, refresh token in httpOnly cookie (set by server)
      tokenManager.setTokens(response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Navigate to home without page reload (preserves memory tokens)
      navigate('/');
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      setError(
        axiosError.response?.data?.error || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (idToken: string) => {
    setError('');

    try {
      setLoading(true);
      console.log('Google login with token:', idToken);

      const response = await authAPI.googleAuth(idToken);

      // Store tokens - access token in memory, refresh token in httpOnly cookie (set by server)
      tokenManager.setTokens(response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      console.log('Google login successful, user:', response.data.user);

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      const axiosError = error as AxiosError<{ error: string }>;
      setError(
        axiosError.response?.data?.error ||
          'Google login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login was cancelled or failed.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="input pl-10"
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={e =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="input pl-10"
                  placeholder="Password"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-900"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn bg-primary-600 text-white hover:bg-primary-700 w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center px-6 py-3 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign in
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Login Button */}
          <div>
            <GoogleLoginButton
              onSuccess={handleGoogleLogin}
              onError={handleGoogleError}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
