import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  AttachMoney,
  DirectionsBus,
  People,
  CalendarToday,
} from '@mui/icons-material';
// import { adminAPI } from '../lib/api';

interface BookingTrend {
  date: string;
  total_bookings: number;
  confirmed_bookings: number;
  total_revenue: number;
  conversion_rate: number;
}

interface RevenueSummary {
  total_revenue: number;
  average_per_day: number;
  average_per_booking: number;
  total_bookings: number;
}

interface PopularRoute {
  route_name: string;
  origin: string;
  destination: string;
  total_bookings: number;
  total_revenue: number;
  avg_occupancy: number;
}

interface ConversionRate {
  total_attempts: number;
  successful_bookings: number;
  conversion_rate: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const ReportsAnalytics: React.FC = () => {
    // Detect dark mode using Tailwind's dark class on body
    const [isDarkMode, setIsDarkMode] = useState(false);
    useEffect(() => {
      const checkDark = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
      checkDark();
      const observer = new MutationObserver(checkDark);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [bookingTrends, setBookingTrends] = useState<BookingTrend[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [popularRoutes, setPopularRoutes] = useState<PopularRoute[]>([]);
  const [conversionRate, setConversionRate] = useState<ConversionRate | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock Data Generation for Presentation
      const generateMockTrends = () => {
        const trends = [];
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        // Limit to 30 days points max for better visualization if range is huge
        const step = diffDays > 30 ? Math.ceil(diffDays / 30) : 1;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + step)) {
          trends.push({
            date: d.toISOString().split('T')[0],
            total_bookings: Math.floor(Math.random() * 50) + 10,
            confirmed_bookings: Math.floor(Math.random() * 40) + 8,
            total_revenue: Math.floor(Math.random() * 5000000) + 1000000,
            conversion_rate: Math.random() * 20 + 5,
          });
        }
        return trends;
      };

      const mockTrends = generateMockTrends();
      const totalRev = mockTrends.reduce((acc, curr) => acc + curr.total_revenue, 0);
      const totalBookings = mockTrends.reduce((acc, curr) => acc + curr.total_bookings, 0);

      const mockRevenue = {
        total_revenue: totalRev,
        average_per_day: mockTrends.length > 0 ? totalRev / mockTrends.length : 0,
        average_per_booking: totalBookings > 0 ? totalRev / totalBookings : 0,
        total_bookings: totalBookings,
      };

      const mockRoutes = [
        { route_name: 'HCM - Da Lat', origin: 'Ho Chi Minh', destination: 'Da Lat', total_bookings: 150, total_revenue: 45000000, avg_occupancy: 85 },
        { route_name: 'HCM - Nha Trang', origin: 'Ho Chi Minh', destination: 'Nha Trang', total_bookings: 120, total_revenue: 36000000, avg_occupancy: 78 },
        { route_name: 'Da Nang - Hue', origin: 'Da Nang', destination: 'Hue', total_bookings: 90, total_revenue: 18000000, avg_occupancy: 65 },
        { route_name: 'Ha Noi - Sa Pa', origin: 'Ha Noi', destination: 'Sa Pa', total_bookings: 200, total_revenue: 80000000, avg_occupancy: 92 },
        { route_name: 'Can Tho - HCM', origin: 'Can Tho', destination: 'Ho Chi Minh', total_bookings: 80, total_revenue: 12000000, avg_occupancy: 60 },
      ];

      const mockConversion = {
        total_attempts: totalBookings * 3,
        successful_bookings: totalBookings,
        conversion_rate: 33.3,
      };

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      setBookingTrends(mockTrends);
      setRevenueSummary(mockRevenue);
      setPopularRoutes(mockRoutes);
      setConversionRate(mockConversion);

      /* Original API calls - Commented out for mock data
      const [trendsRes, revenueRes, routesRes, conversionRes] = await Promise.all([
        adminAPI.getBookingTrends(dateRange.startDate, dateRange.endDate),
        adminAPI.getRevenueSummary(dateRange.startDate, dateRange.endDate),
        adminAPI.getPopularRoutes(dateRange.startDate, dateRange.endDate, 5),
        adminAPI.getConversionRate(dateRange.startDate, dateRange.endDate),
      ]);

      setBookingTrends(trendsRes.data.trends || []);
      setRevenueSummary(revenueRes.data.revenue || null);
      setPopularRoutes(routesRes.data.routes || []);
      setConversionRate(conversionRes.data.conversion || null);
      */
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      // setError(err.response?.data?.error || 'Failed to load analytics data. Please try again.');
      // Fallback to mock data on error so it always shows something
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 dark:bg-gray-900 dark:text-white">
      {/* Header with Date Range Picker */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              Reports & Analytics
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-2">
              <span>
                <svg className="inline h-5 w-5 text-gray-500 dark:text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-4H9V6h2v4z" /></svg>
              </span>
              Track performance and insights
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarToday className="h-5 w-5 text-gray-500 dark:text-blue-400" />
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-white"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-900 p-6 rounded-lg shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(revenueSummary?.total_revenue || 0)}
              </p>
              <p className="text-blue-100 text-xs mt-2">
                Avg: {formatCurrency(revenueSummary?.average_per_day || 0)}/day
              </p>
            </div>
            <AttachMoney className="h-12 w-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-900 p-6 rounded-lg shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Bookings</p>
              <p className="text-2xl font-bold mt-1">{revenueSummary?.total_bookings || 0}</p>
              <p className="text-green-100 text-xs mt-2">
                Avg: {formatCurrency(revenueSummary?.average_per_booking || 0)}/booking
              </p>
            </div>
            <People className="h-12 w-12 text-green-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-700 dark:to-purple-900 p-6 rounded-lg shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Conversion Rate</p>
              <p className="text-2xl font-bold mt-1">
                {conversionRate?.conversion_rate?.toFixed(1) || '0.0'}%
              </p>
              <p className="text-purple-100 text-xs mt-2">
                {conversionRate?.successful_bookings || 0} / {conversionRate?.total_attempts || 0}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-700 dark:to-orange-900 p-6 rounded-lg shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Active Routes</p>
              <p className="text-2xl font-bold mt-1">{popularRoutes.length}</p>
              <p className="text-orange-100 text-xs mt-2">Top performing</p>
            </div>
            <DirectionsBus className="h-12 w-12 text-orange-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Trends Line Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Booking Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={bookingTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#444' : '#e5e7eb'} />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: isDarkMode ? '#e5e7eb' : '#222' }} />
              <YAxis tick={{ fill: isDarkMode ? '#e5e7eb' : '#222' }} />
              <Tooltip
                labelFormatter={formatDate}
                formatter={(value: number | undefined) => [value || 0, '']}
                contentStyle={{ background: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#222' }}
              />
              <Legend wrapperStyle={{ color: isDarkMode ? '#fff' : '#222' }} />
              <Line
                type="monotone"
                dataKey="total_bookings"
                stroke="#3b82f6"
                name="Total Bookings"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="confirmed_bookings"
                stroke="#10b981"
                name="Confirmed"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bookingTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#444' : '#e5e7eb'} />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: isDarkMode ? '#e5e7eb' : '#222' }} />
              <YAxis tick={{ fill: isDarkMode ? '#e5e7eb' : '#222' }} />
              <Tooltip
                labelFormatter={formatDate}
                formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Revenue']}
                contentStyle={{ background: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#222' }}
              />
              <Legend wrapperStyle={{ color: isDarkMode ? '#fff' : '#222' }} />
              <Bar dataKey="total_revenue" fill="#3b82f6" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Routes Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Routes by Bookings</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={popularRoutes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#444' : '#e5e7eb'} />
              <XAxis type="number" tick={{ fill: isDarkMode ? '#e5e7eb' : '#222' }} />
              <YAxis dataKey="route_name" type="category" width={100} tick={{ fill: isDarkMode ? '#e5e7eb' : '#222' }} />
              <Tooltip formatter={(value: number | undefined) => [value || 0, 'Bookings']} contentStyle={{ background: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#222' }} />
              <Bar dataKey="total_bookings" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Route Revenue Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Route</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={popularRoutes as any}
                dataKey="total_revenue"
                nameKey="route_name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {popularRoutes.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Revenue']} contentStyle={{ background: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#222' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Popular Routes Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Popular Routes Detail</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Avg Occupancy
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {popularRoutes.map((route, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DirectionsBus className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{route.route_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-300">
                          {route.origin} → {route.destination}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {route.total_bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-300">
                    {formatCurrency(route.total_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${route.avg_occupancy || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white">{(route.avg_occupancy || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
