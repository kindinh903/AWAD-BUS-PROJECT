import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Bus,
  Users,
  Coins,
  Save,
  X,
  Search,
  Filter,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TripSeatViewer } from './TripSeatViewer';
import { adminAPI } from '../lib/api';
import { formatCurrency } from '../lib/utils';

// Extended trip interface for scheduling
export interface ScheduledTrip {
  id: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  date: string;
  duration: string;
  price: number;
  busType: 'Standard' | 'VIP' | 'Sleeper';
  company: string;
  availableSeats: number;
  totalSeats: number;
  amenities: string[];
  rating: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  driverName: string;
  busPlate: string;
  createdAt: Date;
  updatedAt: Date;
}

/* Mock data removed - using API data instead */

const companies = [
  'Phuong Trang',
  'Mai Linh Express',
  'Sinh Tourist',
  'Hoang Long',
  'Kumho Samco',
  'ANT Bus',
  'Queen Cafe',
];

const amenitiesOptions = [
  'WiFi',
  'AC',
  'Reclining Seats',
  'Sleeper Beds',
  'Snacks',
  'Water',
  'USB Charging',
  'Blanket',
  'Pillow',
  'TV',
];

export const TripScheduler: React.FC = () => {
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<ScheduledTrip | null>(null);
  const [viewingTripSeats, setViewingTripSeats] = useState<ScheduledTrip | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Advanced filters
  const [originFilter, setOriginFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [busTypeFilter, setBusTypeFilter] = useState<string[]>([]);
  const [departureTimeFilter, setDepartureTimeFilter] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000000]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [formData, setFormData] = useState<Partial<ScheduledTrip>>({
    from: '',
    to: '',
    departure: '',
    arrival: '',
    date: '',
    price: 0,
    busType: 'Standard',
    company: '',
    totalSeats: 35,
    availableSeats: 35,
    amenities: [],
    driverName: '',
    busPlate: '',
    status: 'scheduled',
  });

  // Fetch trips, buses, and routes from API
  useEffect(() => {
    fetchTrips();
    fetchBuses();
    fetchRoutes();
  }, []);

  const fetchBuses = async () => {
    try {
      const response = await adminAPI.getAllBuses();
      setBuses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch buses:', error);
      toast.error('Failed to load buses');
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await adminAPI.getAllRoutes();
      setRoutes(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      toast.error('Failed to load routes');
    }
  };

  const fetchTrips = async () => {
    setIsLoading(true);
    try {
      const response = await adminAPI.getAllTrips();
      const apiTrips = response.data.data || [];

      // Transform API response to ScheduledTrip format
      const transformedTrips: ScheduledTrip[] = apiTrips.map((trip: any) => ({
        id: trip.id,
        from: trip.route?.origin || 'Unknown',
        to: trip.route?.destination || 'Unknown',
        departure: new Date(trip.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        arrival: new Date(trip.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        date: new Date(trip.start_time).toISOString().split('T')[0],
        duration: trip.route?.duration || '0h 00m',
        price: trip.price || 0,
        busType: (trip.bus?.bus_type || 'Standard') as 'Standard' | 'VIP' | 'Sleeper',
        company: trip.bus?.name || 'Unknown',
        availableSeats: trip.available_seats || 0,
        totalSeats: trip.total_seats || 0,
        amenities: trip.bus?.amenities || [],
        rating: 4.5,
        status: (trip.status || 'scheduled') as 'scheduled' | 'active' | 'completed' | 'cancelled',
        driverName: trip.driver_name || 'N/A',
        busPlate: trip.bus?.license_plate || 'N/A',
        createdAt: new Date(trip.created_at),
        updatedAt: new Date(trip.updated_at),
      }));

      setTrips(transformedTrips);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function for departure time matching
  const matchesDepartureTime = (trip: ScheduledTrip) => {
    if (departureTimeFilter.length === 0) return true;
    const [hours] = trip.departure.split(':').map(Number);
    return departureTimeFilter.some(time => {
      if (time === 'morning' && hours >= 6 && hours < 12) return true;
      if (time === 'afternoon' && hours >= 12 && hours < 18) return true;
      if (time === 'evening' && hours >= 18 && hours < 22) return true;
      if (time === 'night' && (hours >= 22 || hours < 6)) return true;
      return false;
    });
  };

  // Filter trips based on search and all filters
  const filteredTrips = trips.filter(trip => {
    const matchesSearch =
      trip.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.busPlate.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    const matchesOrigin = !originFilter || trip.from.toLowerCase().includes(originFilter.toLowerCase());
    const matchesDestination = !destinationFilter || trip.to.toLowerCase().includes(destinationFilter.toLowerCase());
    const matchesBusType = busTypeFilter.length === 0 || busTypeFilter.includes(trip.busType.toLowerCase());
    const matchesPrice = trip.price >= priceRange[0] && trip.price <= priceRange[1];
    const matchesTime = matchesDepartureTime(trip);

    return matchesSearch && matchesStatus && matchesOrigin && matchesDestination && matchesBusType && matchesPrice && matchesTime;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTrips = filteredTrips.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, originFilter, destinationFilter, busTypeFilter, departureTimeFilter, priceRange]);

  // Toggle filter functions
  const toggleBusType = (type: string) => {
    setBusTypeFilter(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleDepartureTime = (time: string) => {
    setDepartureTimeFilter(prev => 
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const clearAdvancedFilters = () => {
    setOriginFilter('');
    setDestinationFilter('');
    setBusTypeFilter([]);
    setDepartureTimeFilter([]);
    setPriceRange([0, 2000000]);
  };

  const activeFiltersCount = 
    (originFilter ? 1 : 0) +
    (destinationFilter ? 1 : 0) +
    busTypeFilter.length +
    departureTimeFilter.length +
    (priceRange[0] > 0 || priceRange[1] < 2000000 ? 1 : 0);

  const calculateDuration = (departure: string, arrival: string) => {
    if (!departure || !arrival) return '0h 00m';

    const [depHour, depMin] = departure.split(':').map(Number);
    const [arrHour, arrMin] = arrival.split(':').map(Number);

    let totalMinutes = (arrHour * 60 + arrMin) - (depHour * 60 + depMin);

    // Handle next day arrival
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const handleInputChange = (field: keyof ScheduledTrip, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate duration when departure or arrival changes
      if (field === 'departure' || field === 'arrival') {
        updated.duration = calculateDuration(
          field === 'departure' ? value : prev.departure || '',
          field === 'arrival' ? value : prev.arrival || ''
        );
      }

      // Auto-set available seats when total seats changes
      if (field === 'totalSeats') {
        updated.availableSeats = value;
      }

      return updated;
    });
  };

  const handleAmenitiesChange = (amenity: string) => {
    const currentAmenities = formData.amenities || [];
    const updatedAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity];

    setFormData(prev => ({ ...prev, amenities: updatedAmenities }));
  };

  const openModal = (trip?: ScheduledTrip) => {
    if (trip) {
      setEditingTrip(trip);
      
      // Find route ID
      const route = routes.find(r => r.origin === trip.from && r.destination === trip.to);
      setSelectedRouteId(route ? route.id : '');

      // Find bus ID based on plate number
      const bus = buses.find(b => b.license_plate === trip.busPlate);
      
      setFormData({
        ...trip,
        busPlate: bus ? bus.id : '', // Use ID for the form select
      });
    } else {
      setEditingTrip(null);
      setSelectedRouteId('');
      setFormData({
        from: '',
        to: '',
        departure: '',
        arrival: '',
        date: new Date().toISOString().split('T')[0],
        price: 0,
        busType: 'Standard',
        company: '',
        totalSeats: 35,
        availableSeats: 35,
        amenities: [],
        driverName: '',
        busPlate: '',
        status: 'scheduled',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTrip(null);
    setSelectedRouteId('');
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRouteId || !formData.departure || !formData.arrival || !formData.date) {
      toast.error('Please select a route and fill in all required fields');
      return;
    }

    if ((formData.price || 0) < 2000) {
      toast.error('Ticket price must be at least 2,000₫');
      return;
    }

    try {
      setIsLoading(true);

      // Combine date with time to create ISO datetime strings
      const startDateTime = `${formData.date}T${formData.departure}:00Z`;
      const endDateTime = `${formData.date}T${formData.arrival}:00Z`;

      if (editingTrip) {
        // Note: Backend may not have updateTrip endpoint, using create instead
        await adminAPI.createTrip({
          routeId: selectedRouteId,
          busId: formData.busPlate || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          price: formData.price || 0,
          notes: formData.driverName ? `Driver: ${formData.driverName}` : undefined,
        });

        // Refresh trips list from backend to get updated data
        await fetchTrips();
        toast.success('Trip updated successfully!');
      } else {
        // Create new trip - call backend API
        if (!selectedRouteId) {
          toast.error('Please select a route');
          setIsLoading(false);
          return;
        }

        // Get selected bus ID from busPlate field
        const selectedBusId = formData.busPlate || undefined;

        // Create trip via API
        await adminAPI.createTrip({
          routeId: selectedRouteId,
          busId: selectedBusId,
          startTime: startDateTime,
          endTime: endDateTime,
          price: formData.price || 0,
          notes: formData.driverName ? `Driver: ${formData.driverName}` : undefined,
        });

        // Refresh trips list
        await fetchTrips();
        toast.success('Trip created successfully!');
      }

      closeModal();
    } catch (error: any) {
      console.error('Failed to save trip:', error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        toast.error('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      } else if (error.response?.status === 404) {
        toast.error('Backend endpoint not found. Please restart the Go backend server.');
      } else {
        toast.error(error.response?.data?.details || error.response?.data?.error || 'Failed to save trip');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      setTrips(prev => prev.filter(trip => trip.id !== id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 dark:bg-gray-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Trip Scheduler
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Create, edit, and manage bus trip schedules
            {!isLoading && ` • ${filteredTrips.length} ${filteredTrips.length === 1 ? 'trip' : 'trips'} found`}
            {!isLoading && totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Trip
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <input
                type="text"
                placeholder="Search trips by city, company, driver, or bus plate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
            >
              <Filter className="h-4 w-4" />
              Advanced Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAdvancedFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Origin City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  From City
                </label>
                <input
                  type="text"
                  placeholder="Any city"
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* Destination City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  To City
                </label>
                <input
                  type="text"
                  placeholder="Any city"
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* Bus Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Bus className="inline h-4 w-4 mr-1" />
                  Bus Type
                </label>
                <div className="space-y-2">
                  {['standard', 'vip', 'sleeper'].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={busTypeFilter.includes(type)}
                        onChange={() => toggleBusType(type)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Departure Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Departure Time
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'morning', label: 'Morning (6AM-12PM)' },
                    { value: 'afternoon', label: 'Afternoon (12PM-6PM)' },
                    { value: 'evening', label: 'Evening (6PM-10PM)' },
                    { value: 'night', label: 'Night (10PM-6AM)' }
                  ].map(time => (
                    <label key={time.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={departureTimeFilter.includes(time.value)}
                        onChange={() => toggleDepartureTime(time.value)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{time.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Coins className="inline h-4 w-4 mr-1" />
                  Price Range
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="2000000"
                    step="50000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 flex-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Min</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(priceRange[0])}
                      </span>
                    </div>
                    <span className="text-gray-400">—</span>
                    <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 flex-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Max</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(priceRange[1])}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trips', value: trips.length, icon: Bus, color: 'blue' },
          { label: 'Scheduled', value: trips.filter(t => t.status === 'scheduled').length, icon: Calendar, color: 'blue' },
          { label: 'Active', value: trips.filter(t => t.status === 'active').length, icon: Clock, color: 'green' },
          { label: 'Total Seats', value: trips.reduce((acc, trip) => acc + trip.totalSeats, 0), icon: Users, color: 'orange' },
        ].map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
            </div>
          </div>
        ))}
      </div>

      {/* Trip List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Scheduled Trips ({filteredTrips.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Route & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bus Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {trip.from} → {trip.to}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {trip.date} | {trip.departure} - {trip.arrival}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-400">{trip.duration}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{trip.company}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">{trip.driverName}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-400">{trip.busPlate}</div>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${trip.busType === 'VIP' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                          trip.busType === 'Sleeper' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                        {trip.busType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {trip.availableSeats}/{trip.totalSeats}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${((trip.totalSeats - trip.availableSeats) / trip.totalSeats) * 100}%`
                        }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Coins className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(trip.price)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 text-sm rounded-full border ${getStatusColor(trip.status)} dark:border-opacity-60`}> 
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingTripSeats(trip)}
                        className="text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 p-1 rounded"
                        title="View Seats"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal(trip)}
                        className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 p-1 rounded"
                        title="Edit Trip"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        className="text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 p-1 rounded"
                        title="Delete Trip"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading trips...</p>
            </div>
          )}

          {!isLoading && filteredTrips.length === 0 && (
            <div className="text-center py-8">
              <Bus className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No trips found matching your criteria.</p>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 py-2 text-gray-500">...</span>;
                  }
                  return null;
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Add/Edit Trip */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingTrip ? 'Edit Trip' : 'Create New Trip'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white p-1"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Route Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Route *
                  </label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => {
                      const routeId = e.target.value;
                      setSelectedRouteId(routeId);
                      const route = routes.find(r => r.id === routeId);
                      if (route) {
                        setFormData(prev => ({
                          ...prev,
                          from: route.origin,
                          to: route.destination,
                          price: Math.max(route.base_price, 2000),
                        }));
                      }
                    }}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    required
                  >
                    <option value="">Select a route</option>
                    {routes.filter(r => r.is_active).map(route => (
                      <option key={route.id} value={route.id}>
                        {route.origin} → {route.destination} ({route.duration_minutes}min, {formatCurrency(Math.max(route.base_price, 2000))})
                      </option>
                    ))}
                  </select>
                  {routes.length === 0 && (
                    <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                      No routes available. Please create a route first in the Routes tab.
                    </p>
                  )}
                </div>

                {/* Time Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Departure Time *
                    </label>
                    <input
                      type="time"
                      value={formData.departure || ''}
                      onChange={(e) => handleInputChange('departure', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Arrival Time *
                    </label>
                    <input
                      type="time"
                      value={formData.arrival || ''}
                      onChange={(e) => handleInputChange('arrival', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Duration Display */}
                {formData.departure && formData.arrival && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">
                        Trip Duration: {calculateDuration(formData.departure, formData.arrival)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Bus Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bus Company
                    </label>
                    <select
                      value={formData.company || ''}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select company</option>
                      {companies.map(company => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bus Type
                    </label>
                    <select
                      value={formData.busType || 'Standard'}
                      onChange={(e) => handleInputChange('busType', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    >
                      <option value="Standard">Standard</option>
                      <option value="VIP">VIP</option>
                      <option value="Sleeper">Sleeper</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price (₫)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="2000"
                      value={formData.price || ''}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Driver and Bus Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Driver Name
                    </label>
                    <input
                      type="text"
                      value={formData.driverName || ''}
                      onChange={(e) => handleInputChange('driverName', e.target.value)}
                      placeholder="Enter driver name"
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Bus (Optional)
                    </label>
                    <select
                      value={formData.busPlate || ''}
                      onChange={(e) => handleInputChange('busPlate', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">No bus assigned yet</option>
                      {buses.map((bus: any) => (
                        <option key={bus.id} value={bus.id}>
                          {bus.name} - {bus.license_plate} ({bus.bus_type}, {bus.seat_map?.total_seats || 40} seats)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      The bus will use its configured seat map. You can assign a bus now or later.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Seats (Read-only)
                    </label>
                    <input
                      type="number"
                      value={
                        formData.busPlate
                          ? buses.find(b => b.id === formData.busPlate)?.seat_map?.total_seats || 40
                          : formData.totalSeats || 40
                      }
                      disabled
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700 cursor-not-allowed dark:text-white"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || 'scheduled'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Amenities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amenities
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {amenitiesOptions.map((amenity) => (
                      <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.amenities || []).includes(amenity)}
                          onChange={() => handleAmenitiesChange(amenity)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    {editingTrip ? 'Update Trip' : 'Create Trip'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Seat Viewer Modal */}
      {viewingTripSeats && (
        <TripSeatViewer
          tripId={viewingTripSeats.id}
          tripInfo={{
            from: viewingTripSeats.from,
            to: viewingTripSeats.to,
            departure: viewingTripSeats.departure,
            date: viewingTripSeats.date,
            busType: viewingTripSeats.busType,
          }}
          onClose={() => setViewingTripSeats(null)}
        />
      )}
    </div>
  );
};