import { useState, useEffect } from 'react';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import PeopleIcon from '@mui/icons-material/People';
import DownloadIcon from '@mui/icons-material/Download';
import { bookingAPI, reviewAPI } from '../lib/api';
import { tokenManager } from '../lib/tokenManager';
import { formatCurrency } from '../lib/utils';
import ReviewForm from '../components/ReviewForm';

interface Trip {
    id: string;
    route?: {
        origin: string;
        destination: string;
    };
    departure_time?: string;  // Added for consistency
    start_time: string;
    end_time: string;
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

interface Review {
    id: string;
    booking_id: string;
    trip_id: string;
    rating: number;
    title?: string;
    comment?: string;
}

export default function BookingHistoryPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
    const [showReviewForm, setShowReviewForm] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        // Check authentication status
        const token = tokenManager.getAccessToken();
        setIsAuthenticated(!!token);
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadBookings();
            loadMyReviews();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, page]);

    const loadBookings = async () => {
        try {
            setLoading(true);
            const response = await bookingAPI.getMyBookings(page, 10);
            const data = response.data;
            setBookings(data.data || []);
            if (data.pagination) {
                setTotalPages(data.pagination.total_pages || 1);
            }
        } catch (error) {
            console.error('Failed to load bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMyReviews = async () => {
        try {
            const response = await reviewAPI.getMyReviews();
            setReviews(response.data.data || []);
        } catch (error) {
            console.error('Failed to load reviews:', error);
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

    const hasReview = (bookingId: string) => {
        return reviews.some(r => r.booking_id === bookingId);
    };

    const getBookingReview = (bookingId: string) => {
        return reviews.find(r => r.booking_id === bookingId);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return 'N/A';
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

    const canReview = (booking: Booking) => {
        // Can only review confirmed or completed bookings
        const status = booking.status.toLowerCase();
        return (status === 'confirmed' || status === 'completed') && !hasReview(booking.id);
    };

    const isTripCompleted = (booking: Booking) => {
        if (!booking.trip?.end_time) return false;
        return new Date(booking.trip.end_time) < new Date();
    };

    const handleReviewSuccess = () => {
        setShowReviewForm(null);
        loadMyReviews();
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <PeopleIcon sx={{ fontSize: 64 }} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Sign In Required</h2>
                    <p className="text-gray-500 dark:text-gray-400">Please sign in to view your booking history</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading your bookings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Booking History</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">View your past trips and leave reviews</p>
                </div>

                {/* Bookings List */}
                {bookings.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
                        <ConfirmationNumberIcon sx={{ fontSize: 64 }} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Bookings Yet</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            You haven't made any bookings yet. Start exploring our routes!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => {
                            // Use departure_time or start_time
                            const departureTime = booking.trip?.departure_time || booking.trip?.start_time;
                            
                            return (
                            <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                                {/* Booking Header */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    onClick={() => toggleBookingExpand(booking.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {booking.trip?.route?.origin || 'Unknown'} → {booking.trip?.route?.destination || 'Unknown'}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                    {getStatusIcon(booking.status)}
                                                    {booking.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <ConfirmationNumberIcon sx={{ fontSize: 16 }} />
                                                    {booking.booking_reference}
                                                </span>
                                                {departureTime && (
                                                    <>
                                                        <span className="flex items-center gap-1">
                                                            <CalendarTodayIcon sx={{ fontSize: 16 }} />
                                                            {formatDate(departureTime)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <AccessTimeIcon sx={{ fontSize: 16 }} />
                                                            {formatTime(departureTime)}
                                                        </span>
                                                    </>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <PeopleIcon sx={{ fontSize: 16 }} />
                                                    {booking.total_seats} seat(s)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                {formatCurrency(booking.total_amount || 0)}
                                            </span>
                                            {expandedBookings.has(booking.id) ? (
                                                <ExpandLessIcon sx={{ fontSize: 20 }} className="text-gray-400 dark:text-gray-600" />
                                            ) : (
                                                <ExpandMoreIcon sx={{ fontSize: 20 }} className="text-gray-400 dark:text-gray-600" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedBookings.has(booking.id) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4">
                                        {/* Passengers */}
                                        {booking.passengers && booking.passengers.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Passengers</h4>
                                                <div className="grid gap-2">
                                                    {booking.passengers.map((passenger) => (
                                                        <div
                                                            key={passenger.id}
                                                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                                                        >
                                                            <span className="font-medium text-gray-900 dark:text-white">{passenger.full_name}</span>
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                Seat {passenger.seat_number} ({passenger.seat_type})
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                            {booking.status.toLowerCase() === 'confirmed' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        bookingAPI.downloadBookingTickets(booking.id);
                                                    }}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    <DownloadIcon sx={{ fontSize: 16 }} />
                                                    Download Tickets
                                                </button>
                                            )}

                                            {/* Review Section */}
                                            {hasReview(booking.id) ? (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <StarIcon sx={{ fontSize: 16 }} className="text-yellow-500 fill-yellow-500" />
                                                    <span>Your rating: {getBookingReview(booking.id)?.rating}/5</span>
                                                </div>
                                            ) : canReview(booking) && isTripCompleted(booking) ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowReviewForm(booking.id);
                                                    }}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                                >
                                                    <StarIcon sx={{ fontSize: 16 }} />
                                                    Write Review
                                                </button>
                                            ) : null}
                                        </div>

                                        {/* Review Form */}
                                        {showReviewForm === booking.id && booking.trip && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <ReviewForm
                                                    tripId={booking.trip.id}
                                                    bookingId={booking.id}
                                                    onSuccess={handleReviewSuccess}
                                                    onCancel={() => setShowReviewForm(null)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center mt-8 gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
