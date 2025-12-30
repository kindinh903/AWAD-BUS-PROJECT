import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DescriptionIcon from '@mui/icons-material/Description';
import PrintIcon from '@mui/icons-material/Print';
import { bookingAPI } from '../lib/api';
import { tokenManager } from '../lib/tokenManager';
import { formatCurrency } from '../lib/utils';

interface Trip {
    id: string;
    route?: {
        origin: string;
        destination: string;
    };
    departure_time: string;
    arrival_time: string;
    status: string;
}

interface Passenger {
    id: string;
    full_name: string;
    seat_number: string;
    seat_type: string;
}

interface Booking {
    id: string;
    booking_reference: string;
    trip_id: string;
    trip?: Trip;
    contact_name: string;
    contact_email: string;
    total_seats: number;
    total_amount: number;
    status: string;
    payment_status: string;
    created_at: string;
    confirmed_at?: string;
    passengers?: Passenger[];
}

export default function UserDashboardPage() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
    const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalBookings: 0,
        upcomingTrips: 0,
        completedTrips: 0
    });

    useEffect(() => {
        const token = tokenManager.getAccessToken();
        setIsAuthenticated(!!token);
        
        if (!token) {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadDashboardData();
        }
    }, [isAuthenticated]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            // Fetch first page of bookings
            const response = await bookingAPI.getMyBookings(1, 20);
            const allBookings = response.data.data || [];

            // Separate upcoming and past bookings
            const now = new Date();
            const upcoming = allBookings.filter((b: Booking) => {
                if (!b.trip?.departure_time) return false;
                const departureTime = new Date(b.trip.departure_time);
                return departureTime > now && (b.status === 'confirmed' || b.status === 'pending');
            }).slice(0, 3); // Show max 3 upcoming

            const recent = allBookings.slice(0, 5); // Show 5 most recent

            setUpcomingBookings(upcoming);
            setRecentBookings(recent);

            // Calculate stats
            const completed = allBookings.filter((b: Booking) => b.status === 'completed').length;
            setStats({
                totalBookings: allBookings.length,
                upcomingTrips: upcoming.length,
                completedTrips: completed
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return <CheckCircleIcon sx={{ fontSize: 16 }} />;
            case 'pending': return <ErrorIcon sx={{ fontSize: 16 }} />;
            case 'cancelled': return <CancelIcon sx={{ fontSize: 16 }} />;
            case 'completed': return <CheckCircleIcon sx={{ fontSize: 16 }} />;
            default: return null;
        }
    };

    const handleDownloadTickets = (bookingId: string) => {
        bookingAPI.downloadBookingTickets(bookingId);
    };

    const handleDownloadAllTickets = () => {
        upcomingBookings.forEach(booking => {
            if (booking.status === 'confirmed') {
                bookingAPI.downloadBookingTickets(booking.id);
            }
        });
    };

    const handlePrintAllTickets = () => {
        upcomingBookings.forEach(booking => {
            if (booking.status === 'confirmed') {
                const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/bookings/${booking.id}/tickets/download`;
                const printWindow = window.open(url, '_blank');
                if (printWindow) {
                    printWindow.onload = () => printWindow.print();
                }
            }
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <PersonIcon sx={{ fontSize: 64 }} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Sign In Required</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Please sign in to view your dashboard</p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Sign In
                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your bookings and tickets</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Bookings</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalBookings}</p>
                            </div>
                            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <DescriptionIcon sx={{ fontSize: 24 }} className="text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Upcoming Trips</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.upcomingTrips}</p>
                            </div>
                            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                <ConfirmationNumberIcon sx={{ fontSize: 24 }} className="text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Completed Trips</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completedTrips}</p>
                            </div>
                            <div className="h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <CheckCircleIcon sx={{ fontSize: 24 }} className="text-gray-600 dark:text-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upcoming Trips Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upcoming Trips</h2>
                        {upcomingBookings.length > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownloadAllTickets}
                                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <DownloadIcon sx={{ fontSize: 16 }} />
                                    Download All
                                </button>
                                <button
                                    onClick={handlePrintAllTickets}
                                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <PrintIcon sx={{ fontSize: 16 }} />
                                    Print All
                                </button>
                            </div>
                        )}
                    </div>

                    {upcomingBookings.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
                            <ConfirmationNumberIcon sx={{ fontSize: 64 }} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Upcoming Trips</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                You don't have any upcoming trips. Start planning your next journey!
                            </p>
                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Book a Trip
                                <ArrowForwardIcon sx={{ fontSize: 16 }} />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {upcomingBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                        {booking.trip?.route?.origin || 'Unknown'} → {booking.trip?.route?.destination || 'Unknown'}
                                                    </h3>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                        {getStatusIcon(booking.status)}
                                                        {booking.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Booking Reference: <span className="font-mono font-semibold">{booking.booking_reference}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                    {formatCurrency(booking.total_amount || 0)}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {booking.total_seats} seat(s)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <CalendarTodayIcon sx={{ fontSize: 20 }} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Departure Date</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        {booking.trip?.departure_time ? formatDate(booking.trip.departure_time) : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <AccessTimeIcon sx={{ fontSize: 20 }} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Departure Time</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        {booking.trip?.departure_time ? formatTime(booking.trip.departure_time) : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Passengers */}
                                        {booking.passengers && booking.passengers.length > 0 && (
                                            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                    <PersonIcon sx={{ fontSize: 16 }} />
                                                    Passengers
                                                </h4>
                                                <div className="grid gap-2">
                                                    {booking.passengers.map((passenger) => (
                                                        <div
                                                            key={passenger.id}
                                                            className="flex items-center justify-between text-sm"
                                                        >
                                                            <span className="font-medium text-gray-900 dark:text-white">{passenger.full_name}</span>
                                                            <span className="text-gray-600 dark:text-gray-400">
                                                                Seat {passenger.seat_number} · {passenger.seat_type}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            {booking.status === 'confirmed' && (
                                                <button
                                                    onClick={() => handleDownloadTickets(booking.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                                >
                                                    <DownloadIcon sx={{ fontSize: 16 }} />
                                                    Download Tickets
                                                </button>
                                            )}
                                            <button
                                                onClick={() => navigate(`/booking-history`)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                            >
                                                View Details
                                                <ChevronRightIcon sx={{ fontSize: 16 }} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Bookings Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                        <Link
                            to="/booking-history"
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
                        >
                            View All Bookings
                            <ChevronRightIcon sx={{ fontSize: 16 }} />
                        </Link>
                    </div>

                    {recentBookings.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center border border-gray-200 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400">No recent bookings</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                            {recentBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    onClick={() => navigate('/booking-history')}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <ConfirmationNumberIcon sx={{ fontSize: 20 }} className="text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                                    {booking.trip?.route?.origin || 'Unknown'} → {booking.trip?.route?.destination || 'Unknown'}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                    <span className="font-mono">{booking.booking_reference}</span>
                                                    <span>•</span>
                                                    <span>{booking.trip?.departure_time ? formatDate(booking.trip.departure_time) : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                {getStatusIcon(booking.status)}
                                                {booking.status}
                                            </span>
                                            <ChevronRightIcon sx={{ fontSize: 20 }} className="text-gray-400 dark:text-gray-600" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
