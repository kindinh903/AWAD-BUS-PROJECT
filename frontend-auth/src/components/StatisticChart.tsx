import { useState } from 'react';
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
import { ChevronDown } from 'lucide-react';
import {
  revenueChartData,
  bookingStatusData,
  tripPerformanceData,
  systemStatusData,
  UserRole,
} from '../lib/mockData';

interface StatisticChartProps {
  role: UserRole;
}

type ChartType = 'revenue' | 'booking' | 'performance' | 'system';

export default function StatisticChart({ role }: StatisticChartProps) {
  const [chartType, setChartType] = useState<ChartType>('revenue');

  // Get available charts based on role
  const getAvailableCharts = (): { value: ChartType; label: string }[] => {
    switch (role) {
      case 'admin':
        return [
          { value: 'revenue', label: 'Revenue Trend' },
          { value: 'booking', label: 'Booking Status' },
          { value: 'performance', label: 'Trip Performance' },
          { value: 'system', label: 'System Status' },
        ];
      case 'manager':
        return [
          { value: 'booking', label: 'Booking Status' },
          { value: 'performance', label: 'Trip Performance' },
        ];
      case 'user':
        return [{ value: 'performance', label: 'My Trip History' }];
      default:
        return [];
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'revenue':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Revenue ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'booking':
        return (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-80">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bookingStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bookingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} bookings`} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2">
              {bookingStatusData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-700">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'performance':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tripPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="value"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                name="Trips Completed"
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'system':
        return (
          <div className="space-y-3 h-80 overflow-y-auto">
            {systemStatusData.map(status => (
              <div
                key={status.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{status.name}</p>
                  <p className="text-sm text-gray-500">
                    Uptime: {status.uptime}%
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 rounded-full">
                    ✓ Online
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const availableCharts = getAvailableCharts();

  if (availableCharts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {availableCharts.find(c => c.value === chartType)?.label ||
            'Statistics'}
        </h2>

        {/* Chart Type Selector */}
        {availableCharts.length > 1 && (
          <div className="relative">
            <select
              value={chartType}
              onChange={e => setChartType(e.target.value as ChartType)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10 text-sm"
            >
              {availableCharts.map(chart => (
                <option key={chart.value} value={chart.value}>
                  {chart.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="w-full">{renderChart()}</div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">↑ 12.5%</p>
            <p className="text-xs text-gray-600">Weekly increase</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">$48.5K</p>
            <p className="text-xs text-gray-600">Total revenue</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">856</p>
            <p className="text-xs text-gray-600">Active users</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">3</p>
            <p className="text-xs text-gray-600">Pending issues</p>
          </div>
        </div>
      </div>
    </div>
  );
}
