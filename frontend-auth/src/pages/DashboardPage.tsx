import { useState, useEffect } from 'react';
import { AdminDashboard } from '../components/AdminDashboard';
import { UserDashboard } from '../components/UserDashboard';
import { tokenManager } from '../lib/tokenManager';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('passenger');

  useEffect(() => {
    // Get user info from token or localStorage
    const userInfo = tokenManager.getUserInfo();
    const storedUser = localStorage.getItem('user');

    if (userInfo) {
      setUser(userInfo);
      setUserRole(userInfo.role);
    } else if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setUserRole(userData.role || 'passenger');
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUserRole('passenger');
      }
    }
  }, []);

  // Show loading state while determining user role
  if (!user && !userRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Render dashboard based on user role
  if (userRole === 'admin') {
    return <AdminDashboard user={user} />;
  }

  // Default to user dashboard for passengers and other roles
  return <UserDashboard user={user} />;
}
