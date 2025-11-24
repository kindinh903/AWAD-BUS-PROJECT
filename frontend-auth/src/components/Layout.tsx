import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { authEvents } from '../lib/api';

export default function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for logout events (e.g., token refresh failed)
    const unsubscribe = authEvents.on(event => {
      if (event.type === 'logout') {
        navigate('/login');
      }
    });

    return unsubscribe;
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
