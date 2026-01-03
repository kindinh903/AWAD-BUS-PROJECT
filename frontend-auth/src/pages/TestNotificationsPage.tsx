import { useState } from 'react';
import { notificationAPI } from '../lib/api';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function TestNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const createTestNotifications = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await notificationAPI.createTestNotifications();
      setMessage(`✅ ${response.data.message} (${response.data.count} notifications)`);
    } catch (error: any) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <NotificationsActiveIcon 
              sx={{ fontSize: 64 }} 
              className="text-blue-600 dark:text-blue-400 mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Test Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Click the button below to create sample notifications
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={createTestNotifications}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Creating notifications...
                </>
              ) : (
                <>
                  <NotificationsActiveIcon />
                  Create Test Notifications
                </>
              )}
            </button>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.startsWith('✅') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon />
                  <p className="font-medium">{message}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              What this does:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Creates 3 sample notifications in your account</li>
              <li>• Notifications will appear in the bell icon dropdown</li>
              <li>• Check the notification bell in the navbar to see them</li>
              <li>• You can mark them as read or delete them</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
