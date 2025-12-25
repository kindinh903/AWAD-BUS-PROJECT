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
  DollarSign,
  Save,
  X,
  Search,
  Filter,
  Eye,
} from 'lucide-react';
import { TripSeatViewer } from './TripSeatViewer';
import { adminAPI } from '../lib/api';

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

// Mock data for scheduled trips
const initialTrips: ScheduledTrip[] = [
  {
    id: '1',
    from: 'Ho Chi Minh City',
    to: 'Da Nang',
    departure: '08:00',
    arrival: '20:00',
    date: '2025-12-15',
    duration: '12h 00m',
    price: 25.0,
    busType: 'VIP',
    company: 'Phuong Trang',
    availableSeats: 12,
    totalSeats: 45,
    amenities: ['WiFi', 'AC', 'Reclining Seats', 'Snacks'],
    rating: 4.5,
    status: 'scheduled',
    driverName: 'Nguyen Van A',
    busPlate: '51B-12345',
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2025-12-01'),
  },
  {
    id: '2',
    from: 'Hanoi',
    to: 'Hai Phong',
    departure: '07:00',
    arrival: '09:30',
    date: '2025-12-16',
    duration: '2h 30m',
    price: 10.0,
    busType: 'Standard',
    company: 'Hoang Long',
    availableSeats: 15,
    totalSeats: 35,
    amenities: ['AC'],
    rating: 4.0,
    status: 'active',
    driverName: 'Tran Van B',
    busPlate: '30A-67890',
    createdAt: new Date('2025-11-28'),
    updatedAt: new Date('2025-12-01'),
  },
];

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
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await adminAPI.getAllRoutes();
      setRoutes(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Filter trips based on search and status
  const filteredTrips = trips.filter(trip => {
    const matchesSearch =
      trip.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.busPlate.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
      setFormData(trip);
      setSelectedRouteId(''); // Editing not supported via API yet
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
      alert('Please select a route and fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);

      if (editingTrip) {
        // For now, editing is not implemented on backend
        // Just update local state
        const tripData: ScheduledTrip = {
          id: editingTrip.id,
          from: formData.from!,
          to: formData.to!,
          departure: formData.departure!,
          arrival: formData.arrival!,
          date: formData.date!,
          duration: calculateDuration(formData.departure!, formData.arrival!),
          price: formData.price || 0,
          busType: formData.busType || 'Standard',
          company: formData.company || '',
          availableSeats: formData.availableSeats || formData.totalSeats || 35,
          totalSeats: formData.totalSeats || 35,
          amenities: formData.amenities || [],
          rating: editingTrip.rating,
          status: formData.status || 'scheduled',
          driverName: formData.driverName || '',
          busPlate: formData.busPlate || '',
          createdAt: editingTrip.createdAt,
          updatedAt: new Date(),
        };
        setTrips(prev => prev.map(trip => trip.id === editingTrip.id ? tripData : trip));
      } else {
        // Create new trip - call backend API
        if (!selectedRouteId) {
          alert('Please select a route');
          setIsLoading(false);
          return;
        }

        // Combine date with time to create ISO datetime strings
        const startDateTime = `${formData.date}T${formData.departure}:00`;
        const endDateTime = `${formData.date}T${formData.arrival}:00`;

        // Get selected bus ID from busPlate field
        const selectedBusId = formData.busPlate || undefined;

        // Create trip via API
        const response = await adminAPI.createTrip({
          routeId: selectedRouteId,
          busId: selectedBusId,
          startTime: startDateTime,
          endTime: endDateTime,
          price: formData.price || 0,
          notes: formData.driverName ? `Driver: ${formData.driverName}` : undefined,
        });

        // Refresh trips list
        await fetchTrips();
        alert('Trip created successfully!');
      }

      closeModal();
    } catch (error: any) {
      console.error('Failed to save trip:', error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        alert('Cannot connect to server. Please make sure the backend is running on http://localhost:8080');
      } else if (error.response?.status === 404) {
        alert('Backend endpoint not found. Please restart the Go backend server to load the new CreateTrip endpoint.');
      } else {
        alert(error.response?.data?.details || error.response?.data?.error || 'Failed to save trip');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Trip Scheduler
          </h2>
          <p className="text-gray-600 mt-1">Create, edit, and manage bus trip schedules</p>
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
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search trips by city, company, driver, or bus plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trips', value: trips.length, icon: Bus, color: 'blue' },
          { label: 'Scheduled', value: trips.filter(t => t.status === 'scheduled').length, icon: Calendar, color: 'blue' },
          { label: 'Active', value: trips.filter(t => t.status === 'active').length, icon: Clock, color: 'green' },
          { label: 'Total Seats', value: trips.reduce((acc, trip) => acc + trip.totalSeats, 0), icon: Users, color: 'orange' },
        ].map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
            </div>
          </div>
        ))}
      </div>

      {/* Trip List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Scheduled Trips ({filteredTrips.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {trip.from} → {trip.to}
                        </div>
                        <div className="text-sm text-gray-500">
                          {trip.date} | {trip.departure} - {trip.arrival}
                        </div>
                        <div className="text-xs text-gray-400">{trip.duration}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{trip.company}</div>
                      <div className="text-sm text-gray-500">{trip.driverName}</div>
                      <div className="text-xs text-gray-400">{trip.busPlate}</div>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${trip.busType === 'VIP' ? 'bg-purple-100 text-purple-800' :
                          trip.busType === 'Sleeper' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {trip.busType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">
                        {trip.availableSeats}/{trip.totalSeats}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
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
                      <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-lg font-semibold text-gray-900">${trip.price}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 text-sm rounded-full border ${getStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingTripSeats(trip)}
                        className="text-green-600 hover:text-green-800 p-1 rounded"
                        title="View Seats"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal(trip)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded"
                        title="Edit Trip"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
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
              <p className="text-gray-600">Loading trips...</p>
            </div>
          )}

          {!isLoading && filteredTrips.length === 0 && (
            <div className="text-center py-8">
              <Bus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No trips found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Add/Edit Trip */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingTrip ? 'Edit Trip' : 'Create New Trip'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Route Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          price: route.base_price,
                        }));
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a route</option>
                    {routes.filter(r => r.is_active).map(route => (
                      <option key={route.id} value={route.id}>
                        {route.origin} → {route.destination} ({route.duration_minutes}min, {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(route.base_price)})
                      </option>
                    ))}
                  </select>
                  {routes.length === 0 && (
                    <p className="mt-2 text-sm text-orange-600">
                      No routes available. Please create a route first in the Routes tab.
                    </p>
                  )}
                </div>

                {/* Time Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departure Time *
                    </label>
                    <input
                      type="time"
                      value={formData.departure || ''}
                      onChange={(e) => handleInputChange('departure', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arrival Time *
                    </label>
                    <input
                      type="time"
                      value={formData.arrival || ''}
                      onChange={(e) => handleInputChange('arrival', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bus Company
                    </label>
                    <select
                      value={formData.company || ''}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select company</option>
                      {companies.map(company => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bus Type
                    </label>
                    <select
                      value={formData.busType || 'Standard'}
                      onChange={(e) => handleInputChange('busType', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Standard">Standard</option>
                      <option value="VIP">VIP</option>
                      <option value="Sleeper">Sleeper</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price || ''}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Driver and Bus Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Name
                    </label>
                    <input
                      type="text"
                      value={formData.driverName || ''}
                      onChange={(e) => handleInputChange('driverName', e.target.value)}
                      placeholder="Enter driver name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Bus (Optional)
                    </label>
                    <select
                      value={formData.busPlate || ''}
                      onChange={(e) => handleInputChange('busPlate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No bus assigned yet</option>
                      {buses.map((bus: any) => (
                        <option key={bus.id} value={bus.id}>
                          {bus.name} - {bus.license_plate} ({bus.bus_type}, {bus.seat_map?.total_seats || 40} seats)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      The bus will use its configured seat map. You can assign a bus now or later.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Seats (Read-only, from bus seat map)
                    </label>
                    <input
                      type="number"
                      value={
                        formData.busPlate
                          ? buses.find(b => b.id === formData.busPlate)?.seat_map?.total_seats || 40
                          : formData.totalSeats || 40
                      }
                      disabled
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || 'scheduled'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Amenities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <span className="text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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