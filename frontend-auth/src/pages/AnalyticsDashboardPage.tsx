import { useState, useEffect } from 'react';
import { analyticsAPI } from '../lib/api';

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
        route_name: string;
        origin: string;
        destination: string;
        total_bookings: number;
        total_revenue: number;
    }>;
}

interface TrendData {
    date: string;
    total_bookings: number;
    confirmed_bookings: number;
    total_revenue: number;
}

/**
 * AnalyticsDashboardPage provides admin analytics overview.
 * Shows summary cards, charts, and popular routes table.
 */
export default function AnalyticsDashboardPage() {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState('month'); // week, month, quarter

    // Calculate date range based on selection
    const getDateRange = () => {
        const end = new Date();
        const start = new Date();

        switch (dateRange) {
            case 'week':
                start.setDate(start.getDate() - 7);
                break;
            case 'month':
                start.setMonth(start.getMonth() - 1);
                break;
            case 'quarter':
                start.setMonth(start.getMonth() - 3);
                break;
        }

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        };
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch dashboard summary
                const dashboardRes = await analyticsAPI.getDashboard();
                setDashboard(dashboardRes.data?.dashboard);

                // Fetch trends for the selected date range
                const { start, end } = getDateRange();
                const trendsRes = await analyticsAPI.getBookingTrends(start, end);
                setTrends(trendsRes.data?.trends || []);
            } catch (err: any) {
                setError(err.response?.data?.error || 'Failed to load analytics');
                // Set mock data for development if API fails
                setDashboard({
                    today: { total_bookings: 12, confirmed_bookings: 9, total_revenue: 2400000 },
                    this_week: { total_bookings: 85, confirmed_bookings: 72, total_revenue: 17200000 },
                    this_month: { total_bookings: 342, confirmed_bookings: 298, total_revenue: 68500000, conversion_rate: 87.1 },
                    top_routes: [
                        { route_name: 'Hà Nội - Hải Phòng', origin: 'Hà Nội', destination: 'Hải Phòng', total_bookings: 145, total_revenue: 29000000 },
                        { route_name: 'TP.HCM - Đà Lạt', origin: 'TP.HCM', destination: 'Đà Lạt', total_bookings: 89, total_revenue: 22250000 },
                        { route_name: 'Hà Nội - Đà Nẵng', origin: 'Hà Nội', destination: 'Đà Nẵng', total_bookings: 67, total_revenue: 20100000 },
                    ],
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor your business performance</p>
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex gap-2">
                        {['week', 'month', 'quarter'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${dateRange === range
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {range === 'week' ? '7 Days' : range === 'month' ? '30 Days' : '90 Days'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 p-4 rounded-lg mb-6">
                        {error} - Showing sample data
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Today Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium opacity-90">Today</h3>
                            <svg className="w-8 h-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <p className="text-3xl font-bold">{dashboard?.today.confirmed_bookings || 0}</p>
                            <p className="text-sm opacity-80">bookings confirmed of {dashboard?.today.total_bookings || 0}</p>
                            <p className="text-lg font-semibold">{formatCurrency(dashboard?.today.total_revenue || 0)}</p>
                        </div>
                    </div>

                    {/* This Week Card */}
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium opacity-90">This Week</h3>
                            <svg className="w-8 h-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <p className="text-3xl font-bold">{dashboard?.this_week.confirmed_bookings || 0}</p>
                            <p className="text-sm opacity-80">bookings confirmed of {dashboard?.this_week.total_bookings || 0}</p>
                            <p className="text-lg font-semibold">{formatCurrency(dashboard?.this_week.total_revenue || 0)}</p>
                        </div>
                    </div>

                    {/* This Month Card */}
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium opacity-90">This Month</h3>
                            <svg className="w-8 h-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <p className="text-3xl font-bold">{dashboard?.this_month.confirmed_bookings || 0}</p>
                            <p className="text-sm opacity-80">
                                Conversion: {dashboard?.this_month.conversion_rate?.toFixed(1) || 0}%
                            </p>
                            <p className="text-lg font-semibold">{formatCurrency(dashboard?.this_month.total_revenue || 0)}</p>
                        </div>
                    </div>
                </div>

                {/* Popular Routes Table */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-6 border-b dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Popular Routes
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Route</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bookings</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {dashboard?.top_routes?.map((route, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-medium text-sm">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{route.route_name || `${route.origin} → ${route.destination}`}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{route.origin} → {route.destination}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-900 dark:text-white font-medium">{route.total_bookings}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(route.total_revenue)}</span>
                                        </td>
                                    </tr>
                                ))}
                                {(!dashboard?.top_routes || dashboard.top_routes.length === 0) && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            No route data available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Simple Trends Visualization */}
                {trends.length > 0 && (
                    <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Booking Trends</h2>
                        <div className="h-48 flex items-end justify-between gap-1">
                            {trends.slice(-14).map((day, index) => {
                                const maxBookings = Math.max(...trends.slice(-14).map(t => t.total_bookings));
                                const height = maxBookings > 0 ? (day.total_bookings / maxBookings) * 100 : 0;
                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                                        <div
                                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300"
                                            style={{ height: `${Math.max(height, 4)}%` }}
                                            title={`${day.date}: ${day.total_bookings} bookings`}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-full text-center truncate">
                                            {new Date(day.date).getDate()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
