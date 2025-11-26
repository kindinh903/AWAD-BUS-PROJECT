import { useState, useMemo } from 'react';
import { ChevronDown, RotateCw, Search } from 'lucide-react';
import { Activity } from '../lib/mockData';

interface ActivityListProps {
  activities: Activity[];
  onRefresh?: () => void;
}

type SortField = 'timestamp' | 'type' | 'status';
type SortOrder = 'asc' | 'desc';

export default function ActivityList({
  activities,
  onRefresh,
}: ActivityListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredAndSortedActivities = useMemo(() => {
    const filtered = activities.filter(activity => {
      const matchesSearch =
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || activity.type === filterType;
      const matchesStatus =
        filterStatus === 'all' || activity.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      if (sortField === 'timestamp') {
        compareValue = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortField === 'type') {
        compareValue = a.type.localeCompare(b.type);
      } else if (sortField === 'status') {
        compareValue = a.status.localeCompare(b.status);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [activities, searchTerm, filterType, filterStatus, sortField, sortOrder]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    setIsRefreshing(false);
    onRefresh?.();
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      success: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.pending;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      booking: '🎫',
      payment: '💳',
      cancellation: '❌',
      registration: '👤',
    };
    return icons[type] || '📋';
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCw
              size={16}
              className={isRefreshing ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by description or user..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
            >
              <option value="all">All Types</option>
              <option value="booking">Booking</option>
              <option value="payment">Payment</option>
              <option value="cancellation">Cancellation</option>
              <option value="registration">Registration</option>
            </select>
            <ChevronDown
              size={18}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown
              size={18}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <span className="text-sm text-gray-600">
          Showing{' '}
          <span className="font-semibold">
            {filteredAndSortedActivities.length}
          </span>{' '}
          activities
        </span>
        <div className="flex gap-2">
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as SortField)}
            className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-6"
          >
            <option value="timestamp">Sort by Time</option>
            <option value="type">Sort by Type</option>
            <option value="status">Sort by Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="overflow-x-auto">
        <div className="divide-y divide-gray-200">
          {filteredAndSortedActivities.length > 0 ? (
            filteredAndSortedActivities.map(activity => (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="text-2xl flex-shrink-0">
                    {getTypeIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getStatusBadgeColor(activity.status)}`}
                      >
                        {activity.status.charAt(0).toUpperCase() +
                          activity.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {activity.user} • {formatTime(activity.timestamp)}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">
                      {activity.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No activities found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
