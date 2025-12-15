import { useState, useEffect } from 'react';
import {
    Bus, Users, CheckCircle, Search,
    ChevronDown, ChevronUp, ArrowLeft, RefreshCw,
    Calendar, Phone, Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../lib/api';

interface Trip {
    id: string;
    route?: {
        origin: string;
        destination: string;
    };
    bus?: {
        name: string;
        plate_number: string;
    };
    start_time: string;
    end_time: string;
    status: string;
}

interface Passenger {
    passenger_id: string;
    booking_id: string;
    booking_reference: string;
    full_name: string;
    seat_number: string;
    seat_type: string;
    phone?: string;
    email?: string;
    ticket_id: string;
    ticket_number: string;
    checked_in: boolean;
    checked_in_at?: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
}

// Group passengers by booking
interface BookingGroup {
    booking_id: string;
    booking_reference: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    passengers: Passenger[];
}

export default function TripOperationsPage() {
    const navigate = useNavigate();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [bookings, setBookings] = useState<BookingGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [checkingIn, setCheckingIn] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadTrips();
    }, []);

    const loadTrips = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getAllTrips();
            // Sort by start_time descending (most recent first)
            const sortedTrips = (response.data.data || []).sort(
                (a: Trip, b: Trip) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
            );
            setTrips(sortedTrips);
        } catch (error) {
            console.error('Failed to load trips:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPassengers = async (tripId: string) => {
        try {
            setBookingsLoading(true);
            const response = await adminAPI.getTripPassengers(tripId);
            const passengers: Passenger[] = response.data.data || [];

            // Group passengers by booking
            const bookingMap = new Map<string, BookingGroup>();
            passengers.forEach((p: Passenger) => {
                if (!bookingMap.has(p.booking_id)) {
                    bookingMap.set(p.booking_id, {
                        booking_id: p.booking_id,
                        booking_reference: p.booking_reference,
                        contact_name: p.contact_name,
                        contact_email: p.contact_email,
                        contact_phone: p.contact_phone,
                        passengers: [],
                    });
                }
                bookingMap.get(p.booking_id)!.passengers.push(p);
            });

            setBookings(Array.from(bookingMap.values()));
        } catch (error) {
            console.error('Failed to load passengers:', error);
            setBookings([]);
        } finally {
            setBookingsLoading(false);
        }
    };

    const handleCheckIn = async (passenger: Passenger) => {
        if (!selectedTrip || checkingIn) return;
        try {
            setCheckingIn(passenger.passenger_id);
            await adminAPI.checkInPassenger(selectedTrip.id, passenger.passenger_id);
            // Reload passengers to get updated status
            await loadPassengers(selectedTrip.id);
        } catch (error: any) {
            console.error('Failed to check in passenger:', error);
            alert(error.response?.data?.error || 'Failed to check in passenger');
        } finally {
            setCheckingIn(null);
        }
    };

    const handleTripSelect = (trip: Trip) => {
        setSelectedTrip(trip);
        loadPassengers(trip.id);
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedTrip) return;
        try {
            await adminAPI.updateTripStatus(selectedTrip.id, newStatus);
            setSelectedTrip({ ...selectedTrip, status: newStatus });
            loadTrips(); // Refresh the list
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update trip status');
        }
    };

    const toggleBookingExpand = (bookingId: string) => {
        setExpandedBookings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(bookingId)) {
                newSet.delete(bookingId);
            } else {
                newSet.add(bookingId);
            }
            return newSet;
        });
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'scheduled': return 'bg-blue-100 text-blue-700';
            case 'active': return 'bg-green-100 text-green-700';
            case 'departed': return 'bg-yellow-100 text-yellow-700';
            case 'completed': return 'bg-gray-100 text-gray-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredTrips = trips.filter(trip => {
        const matchesSearch =
            trip.route?.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.route?.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.bus?.plate_number.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || trip.status.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading trips...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <Bus className="h-8 w-8 text-blue-600" />
                        <div>
                            <h1 className="text-2xl font-bold">Trip Operations</h1>
                            <p className="text-sm text-gray-500">Manage trips, passengers, and check-ins</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trip List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold">Trips</h2>
                                <button onClick={loadTrips} className="p-1 hover:bg-gray-100 rounded">
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Filters */}
                            <div className="space-y-3 mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search trips..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Status</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="active">Active</option>
                                    <option value="departed">Departed</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            {/* Trip Cards */}
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {filteredTrips.map((trip) => (
                                    <div
                                        key={trip.id}
                                        onClick={() => handleTripSelect(trip)}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedTrip?.id === trip.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-sm">
                                                {trip.route?.origin} → {trip.route?.destination}
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                                                {trip.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatDateTime(trip.start_time)}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {trip.bus?.plate_number}
                                        </div>
                                    </div>
                                ))}

                                {filteredTrips.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        No trips found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Trip Details & Operations */}
                    <div className="lg:col-span-2">
                        {selectedTrip ? (
                            <div className="space-y-4">
                                {/* Trip Info Card */}
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h2 className="text-xl font-bold">
                                                {selectedTrip.route?.origin} → {selectedTrip.route?.destination}
                                            </h2>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {formatDateTime(selectedTrip.start_time)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Bus className="h-4 w-4" />
                                                    {selectedTrip.bus?.plate_number}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedTrip.status)}`}>
                                            {selectedTrip.status}
                                        </span>
                                    </div>

                                    {/* Status Update Actions */}
                                    <div className="border-t pt-4">
                                        <h3 className="text-sm font-medium text-gray-700 mb-3">Update Status</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {['scheduled', 'active', 'departed', 'completed', 'cancelled'].map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => handleStatusUpdate(status)}
                                                    disabled={selectedTrip.status === status}
                                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${selectedTrip.status === status
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'hover:bg-gray-100 border-gray-300'
                                                        }`}
                                                >
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Passengers Section */}
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-600" />
                                            <h3 className="font-semibold">Passengers</h3>
                                        </div>
                                        <button
                                            onClick={() => loadPassengers(selectedTrip.id)}
                                            className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            Refresh
                                        </button>
                                    </div>

                                    {bookingsLoading ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                            <p className="text-sm text-gray-500">Loading passengers...</p>
                                        </div>
                                    ) : bookings.length > 0 ? (
                                        <div className="space-y-3">
                                            {bookings.map((booking) => (
                                                <div key={booking.booking_id} className="border rounded-lg overflow-hidden">
                                                    <button
                                                        onClick={() => toggleBookingExpand(booking.booking_id)}
                                                        className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-medium">{booking.booking_reference}</span>
                                                            <span className="text-sm text-gray-500">
                                                                {booking.passengers?.length || 0} passenger(s)
                                                            </span>
                                                        </div>
                                                        {expandedBookings.has(booking.booking_id) ? (
                                                            <ChevronUp className="h-5 w-5 text-gray-400" />
                                                        ) : (
                                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </button>

                                                    {expandedBookings.has(booking.booking_id) && (
                                                        <div className="p-3 border-t">
                                                            <div className="text-sm text-gray-500 mb-3">
                                                                <div className="flex items-center gap-1">
                                                                    <Mail className="h-4 w-4" />
                                                                    {booking.contact_email}
                                                                </div>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Phone className="h-4 w-4" />
                                                                    {booking.contact_phone}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                {booking.passengers?.map((passenger) => (
                                                                    <div
                                                                        key={passenger.passenger_id}
                                                                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                                                    >
                                                                        <div>
                                                                            <span className="font-medium">{passenger.full_name}</span>
                                                                            <span className="text-sm text-gray-500 ml-2">
                                                                                Seat {passenger.seat_number}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleCheckIn(passenger)}
                                                                            disabled={passenger.checked_in || checkingIn === passenger.passenger_id}
                                                                            className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${passenger.checked_in
                                                                                ? 'bg-green-100 text-green-700 cursor-default'
                                                                                : checkingIn === passenger.passenger_id
                                                                                    ? 'bg-gray-300 text-gray-500 cursor-wait'
                                                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                                                }`}
                                                                        >
                                                                            <CheckCircle className="h-4 w-4" />
                                                                            {passenger.checked_in ? 'Checked In' : checkingIn === passenger.passenger_id ? 'Checking...' : 'Check In'}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                            <p>No bookings for this trip yet</p>
                                            <p className="text-sm mt-1">Passengers will appear here once bookings are made</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                                <Bus className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-700 mb-2">Select a Trip</h3>
                                <p className="text-gray-500">
                                    Choose a trip from the list to view details and manage passengers
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
