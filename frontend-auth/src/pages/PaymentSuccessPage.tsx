import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingAPI } from '../lib/api';

interface BookingData {
    id: string;
    booking_reference: string;
    contact_name: string;
    contact_email: string;
    total_amount: number;
    trip?: {
        route?: {
            origin: string;
            destination: string;
        };
        departure_time: string;
    };
    passengers?: Array<{ full_name: string; seat_number: string }>;
}

/**
 * PaymentSuccessPage displays confirmation after successful payment.
 * Shows booking details and provides ticket download option.
 */
export default function PaymentSuccessPage() {
    const [searchParams] = useSearchParams();
    const [booking, setBooking] = useState<BookingData | null>(null);
    const [loading, setLoading] = useState(true);

    const bookingId = searchParams.get('booking_id');
    const bookingRef = searchParams.get('ref');

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                if (bookingRef) {
                    const res = await bookingAPI.getByReference(bookingRef);
                    setBooking(res.data?.booking);
                } else if (bookingId) {
                    // Try to get from localStorage cache
                    const cached = localStorage.getItem('lastBookingRef');
                    if (cached) {
                        const res = await bookingAPI.getByReference(cached);
                        setBooking(res.data?.booking);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch booking:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [bookingId, bookingRef]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
            <div className="max-w-lg mx-auto">
                {/* Success Animation */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
                        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Payment Successful!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Your booking has been confirmed
                    </p>
                </div>

                {/* Booking Details Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        Your Ticket Details
                    </h2>

                    {booking ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Booking Reference</span>
                                <span className="font-mono font-bold text-green-600 text-lg">
                                    {booking.booking_reference}
                                </span>
                            </div>
                            {booking.trip?.route && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Route</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {booking.trip.route.origin} → {booking.trip.route.destination}
                                    </span>
                                </div>
                            )}
                            {booking.trip?.departure_time && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Departure</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {new Date(booking.trip.departure_time).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Paid</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {booking.total_amount?.toLocaleString('vi-VN')} ₫
                                </span>
                            </div>

                            {/* Passengers */}
                            {booking.passengers && booking.passengers.length > 0 && (
                                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Passengers</h3>
                                    <div className="space-y-2">
                                        {booking.passengers.map((p, i) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">{p.full_name}</span>
                                                <span className="text-gray-500 dark:text-gray-400">Seat {p.seat_number}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-gray-500 dark:text-gray-400">
                                Check your email for booking confirmation
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Link
                        to="/"
                        className="block w-full py-4 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl text-center transition-all duration-300"
                    >
                        Return to Home
                    </Link>
                </div>

                {/* Email Notice */}
                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Confirmation Sent
                    </div>
                    A confirmation email has been sent to {booking?.contact_email || 'your email'}
                </div>
            </div>
        </div>
    );
}
