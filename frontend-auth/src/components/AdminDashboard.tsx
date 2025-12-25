import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  Shield,
  Database,
  Activity,
  RefreshCw,
  Calendar,
  Grid,
  Bus,
} from 'lucide-react';
import { analyticsAPI } from '../lib/api';
import { TripScheduler } from './TripScheduler';
import { RouteManager } from './RouteManager';
import { BusManager } from './BusManager';
import { SeatMapList } from './SeatMapList';
import { SeatMapEditor } from './SeatMapEditor';

interface AdminDashboardProps {
  user: any;
}

interface DashboardData {
  today: {
    total_bookings: number;
    confirmed_bookings: number;
    total_revenue: number;
  };
  this_week: {
    total_bookings: number;
    confirmed_bookings: number;
    total_revenue: number;
  };
  this_month: {
    total_bookings: number;
    confirmed_bookings: number;
    total_revenue: number;
    conversion_rate: number;
  };
  top_routes: Array<{
    route_id: string;
    origin: string;
    destination: string;
    total_bookings: number;
    total_revenue: number;
  }>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Seat map editor state
  const [editingSeatMapId, setEditingSeatMapId] = useState<string | null>(null);
  const [isCreatingSeatMap, setIsCreatingSeatMap] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const dashboardResponse = await analyticsAPI.getDashboard();
      console.log('Dashboard API response:', dashboardResponse.data);
      setDashboardData(dashboardResponse.data.dashboard || dashboardResponse.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const refreshData = () => {
    fetchDashboardData();
  };

  // Transform API data to display format
  const summaryData: Array<{
    id: string;
    title: string;
    value: string | number;
    change?: number;
    icon: string;
    color: 'blue' | 'green' | 'orange' | 'red';
  }> = dashboardData ? [
    {
      id: 'total-bookings',
      title: 'Total Bookings',
      value: dashboardData.this_month?.total_bookings || 0,
      change: undefined,
      icon: '📅',
      color: 'blue' as const,
    },
    {
      id: 'revenue',
      title: 'Revenue',
      value: `${((dashboardData.this_month?.total_revenue || 0) / 1000000).toFixed(1)}M VND`,
      change: undefined,
      icon: '💰',
      color: 'green' as const,
    },
    {
      id: 'active-users',
      title: 'Active Users',
      value: 0, // Not in API
      change: undefined,
      icon: '👥',
      color: 'orange' as const,
    },
    {
      id: 'system-status',
      title: 'System Status',
      value: 'Healthy',
      icon: '✅',
      color: 'green' as const,
    },
  ] : [];

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
                  {card.change !== undefined && (
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
            {['overview', 'users', 'routes', 'trips', 'seat-maps', 'buses', 'reports'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setSelectedTab(tab);
                  if (tab !== 'seat-maps') {
                    setEditingSeatMapId(null);
                    setIsCreatingSeatMap(false);
                  }
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize flex items-center gap-2 ${
                  selectedTab === tab
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'trips' && <Calendar className="h-4 w-4" />}
                {tab === 'seat-maps' && <Grid className="h-4 w-4" />}
                {tab === 'buses' && <Bus className="h-4 w-4" />}
                {tab === 'trips' ? 'Trip Scheduling' : tab === 'seat-maps' ? 'Seat Maps' : tab}
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
            System Overview
          </h2>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading data...</p>
            </div>
          ) : dashboardData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Today's Bookings</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardData.today?.total_bookings || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dashboardData.today?.confirmed_bookings || 0} confirmed
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-gray-600 mb-1">Today's Revenue</div>
                  <div className="text-2xl font-bold text-green-600">
                    {((dashboardData.today?.total_revenue || 0) / 1000000).toFixed(2)}M VND
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="text-sm text-gray-600 mb-1">This Month's Bookings</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboardData.this_month?.total_bookings || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Conversion: {(dashboardData.this_month?.conversion_rate || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="text-sm text-gray-600 mb-1">This Month's Revenue</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {((dashboardData.this_month?.total_revenue || 0) / 1000000).toFixed(2)}M VND
                  </div>
                </div>
              </div>
              
              {/* Top Routes */}
              {dashboardData.top_routes && dashboardData.top_routes.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Routes This Month</h3>
                  <div className="space-y-2">
                    {dashboardData.top_routes.map((route, idx) => (
                      <div key={route.route_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-semibold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {route.origin} → {route.destination}
                            </div>
                            <div className="text-sm text-gray-500">
                              {route.total_bookings} bookings
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {(route.total_revenue / 1000000).toFixed(2)}M ₫
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 text-center text-sm text-gray-500">
                Showing real-time analytics from database
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No data available
            </div>
          )}
        </div>
      )}

      {selectedTab === 'routes' && (
        <RouteManager />
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
        <BusManager />
      )}

      {selectedTab === 'seat-maps' && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md">
          {editingSeatMapId || isCreatingSeatMap ? (
            <SeatMapEditor
              seatMapId={editingSeatMapId || undefined}
              onBack={() => {
                setEditingSeatMapId(null);
                setIsCreatingSeatMap(false);
              }}
              onSave={() => {
                setEditingSeatMapId(null);
                setIsCreatingSeatMap(false);
              }}
            />
          ) : (
            <SeatMapList
              onEdit={(id) => setEditingSeatMapId(id)}
              onCreateNew={() => setIsCreatingSeatMap(true)}
            />
          )}
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
