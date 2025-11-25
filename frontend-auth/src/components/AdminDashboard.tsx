import React from 'react';
import { 
  Users, 
  Bus, 
  MapPin, 
  DollarSign, 
  Settings, 
  BarChart3, 
  AlertTriangle,
  Shield,
  Database,
  Activity
} from 'lucide-react';

interface AdminDashboardProps {
  user: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-red-600 text-white p-6 rounded-lg shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-red-100 mt-2">
              Welcome back, {user?.name || 'Administrator'} | System Management Portal
            </p>
          </div>
          <div className="text-right">
            <div className="bg-red-700 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold">ADMIN ACCESS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">1,234</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Buses</p>
              <p className="text-2xl font-bold text-gray-900">45</p>
            </div>
            <Bus className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Routes</p>
              <p className="text-2xl font-bold text-gray-900">28</p>
            </div>
            <MapPin className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">$45,230</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* System Management */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="h-6 w-6 text-red-600" />
            System Management
          </h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
              <div className="font-semibold text-red-700">User Management</div>
              <div className="text-sm text-red-600">Manage user accounts, roles, and permissions</div>
            </button>
            <button className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
              <div className="font-semibold text-red-700">Bus Fleet Management</div>
              <div className="text-sm text-red-600">Add, edit, and monitor bus fleet status</div>
            </button>
            <button className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
              <div className="font-semibold text-red-700">Route Configuration</div>
              <div className="text-sm text-red-600">Configure bus routes and schedules</div>
            </button>
          </div>
        </div>

        {/* Analytics */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Analytics & Reports
          </h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="font-semibold text-blue-700">Revenue Analytics</div>
              <div className="text-sm text-blue-600">View detailed revenue reports and trends</div>
            </button>
            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="font-semibold text-blue-700">Performance Metrics</div>
              <div className="text-sm text-blue-600">Monitor system performance and usage</div>
            </button>
            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="font-semibold text-blue-700">Customer Insights</div>
              <div className="text-sm text-blue-600">Analyze customer behavior and satisfaction</div>
            </button>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-600" />
          System Alerts & Notifications
        </h2>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <div className="font-semibold text-red-700">Server Maintenance Required</div>
              <div className="text-sm text-red-600">Scheduled maintenance window: Tonight 2:00-4:00 AM</div>
            </div>
          </div>
          <div className="flex items-center p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
            <Activity className="h-5 w-5 text-yellow-500 mr-3" />
            <div>
              <div className="font-semibold text-yellow-700">High Traffic Alert</div>
              <div className="text-sm text-yellow-600">Unusual booking activity detected on Route 15</div>
            </div>
          </div>
          <div className="flex items-center p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
            <Settings className="h-5 w-5 text-blue-500 mr-3" />
            <div>
              <div className="font-semibold text-blue-700">System Update Available</div>
              <div className="text-sm text-blue-600">New features and security patches available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};