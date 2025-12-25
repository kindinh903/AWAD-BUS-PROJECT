import React from 'react';
import { Link } from 'react-router-dom';
import ShieldIcon from '@mui/icons-material/Shield';
import PersonIcon from '@mui/icons-material/Person';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

export const DemoAccounts: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
        <VpnKeyIcon sx={{ fontSize: 20 }} />
        Demo Accounts
      </h3>
      <p className="text-blue-700 mb-4 text-sm">
        Use these pre-created accounts to test different dashboard views:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Admin Account */}
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldIcon sx={{ fontSize: 20 }} className="text-red-600" />
            <span className="font-semibold text-red-700">Admin Account</span>
          </div>
          <div className="text-sm space-y-1">
            <div>
              <strong>Email:</strong> admin@busproject.com
            </div>
            <div>
              <strong>Password:</strong> admin123
            </div>
            <div className="text-red-600 text-xs mt-2">
              ✓ Full system management access
              <br />
              ✓ User management & analytics
              <br />✓ System configuration
            </div>
          </div>
        </div>

        {/* User Account */}
        <div className="bg-white border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <PersonIcon sx={{ fontSize: 20 }} className="text-blue-600" />
            <span className="font-semibold text-blue-700">User Account</span>
          </div>
          <div className="text-sm space-y-1">
            <div>
              <strong>Email:</strong> user@busproject.com
            </div>
            <div>
              <strong>Password:</strong> user123
            </div>
            <div className="text-blue-600 text-xs mt-2">
              ✓ Book bus tickets
              <br />
              ✓ View booking history
              <br />✓ Manage personal profile
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link
          to="/login"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Login Page
        </Link>
      </div>
    </div>
  );
};
