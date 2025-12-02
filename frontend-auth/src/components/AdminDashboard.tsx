import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  Shield,
  Database,
  Activity,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { adminSummaryCards, mockActivities } from '../lib/mockData';
import { TripScheduler } from './TripScheduler';

interface AdminDashboardProps {
  user: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [summaryData, setSummaryData] = useState(adminSummaryCards);
  const [activities] = useState(mockActivities.slice(0, 6));
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Simulate data refresh
  const refreshData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update some values randomly
    const updatedData = summaryData.map(card => ({
      ...card,
      value:
        typeof card.value === 'number'
          ? Math.floor(card.value + Math.random() * 100 - 50)
          : card.value,
      change: card.change ? Math.random() * 20 - 10 : undefined,
    }));

    setSummaryData(updatedData);
    setIsLoading(false);
  };

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
              Welcome back, {user?.name || 'Administrator'} | System Management
              Portal
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="flex items-center gap-2 bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <div className="bg-red-700 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold">ADMIN ACCESS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {summaryData.map(card => {
          const IconMap: { [key: string]: any } = {
            'total-bookings': Users,
            revenue: DollarSign,
            'active-users': Activity,
            'system-status': Database,
          };
          const IconComponent = IconMap[card.id] || Users;
          const colorClasses = {
            blue: 'border-blue-500 text-blue-500',
            green: 'border-green-500 text-green-500',
            orange: 'border-orange-500 text-orange-500',
            red: 'border-red-500 text-red-500',
          };

          return (
            <div
              key={card.id}
              className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${colorClasses[card.color].split(' ')[0]}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </p>
                  {card.change && (
                    <p
                      className={`text-sm ${card.change > 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {card.change > 0 ? '+' : ''}
                      {card.change.toFixed(1)}%
                    </p>
                  )}
                </div>
                <IconComponent
                  className={`h-8 w-8 ${colorClasses[card.color].split(' ')[1]}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'users', 'trips', 'buses', 'reports'].map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize flex items-center gap-2 ${
                  selectedTab === tab
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'trips' && <Calendar className="h-4 w-4" />}
                {tab === 'trips' ? 'Trip Scheduling' : tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            Recent Activities
          </h2>
          <div className="space-y-3">
            {activities.map(activity => {
              const statusColors = {
                success: 'bg-green-50 border-green-200 text-green-800',
                pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                failed: 'bg-red-50 border-red-200 text-red-800',
              };

              const typeIcons = {
                booking: '📅',
                payment: '💰',
                cancellation: '❌',
                registration: '👤',
              };

              return (
                <div
                  key={activity.id}
                  className={`p-4 rounded-lg border ${statusColors[activity.status]}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{typeIcons[activity.type]}</span>
                      <div>
                        <div className="font-semibold">
                          {activity.description}
                        </div>
                        <div className="text-sm opacity-75">
                          by {activity.user}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        {activity.timestamp.toLocaleTimeString()}
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded-full mt-1 ${
                          activity.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : activity.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {activity.status}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center">
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              View All Activities
            </button>
          </div>
        </div>
      )}

      {selectedTab === 'trips' && (
        <TripScheduler />
      )}

      {selectedTab === 'users' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            User Management
          </h2>
          <p className="text-gray-600">User management features coming soon...</p>
        </div>
      )}

      {selectedTab === 'buses' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            Bus Fleet Management
          </h2>
          <p className="text-gray-600">Bus fleet management features coming soon...</p>
        </div>
      )}

      {selectedTab === 'reports' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            Reports & Analytics
          </h2>
          <p className="text-gray-600">Reports and analytics features coming soon...</p>
        </div>
      )}
    </div>
  );
};
