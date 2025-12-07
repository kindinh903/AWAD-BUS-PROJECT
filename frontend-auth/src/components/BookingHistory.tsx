import React, { useEffect, useState } from 'react';
import { bookingAPI } from '../lib/api';
import type { Booking } from '../types/booking';

const BookingHistory: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBookings();
  }, [page]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingAPI.getMyBookings(page, 10);
      setBookings(response.data.data);
      setTotalPages(response.data.total_pages);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingAPI.cancelBooking(bookingId, 'Cancelled by user');
      fetchBookings(); // Refresh list
      alert('Booking cancelled successfully');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const handleDownloadTickets = (bookingId: string) => {
    bookingAPI.downloadBookingTickets(bookingId);
  };

  const handleResendTickets = async (bookingId: string) => {
    try {
      await bookingAPI.resendTickets(bookingId);
      alert('Tickets have been resent to your email');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resend tickets');
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Bookings</h2>
        <button
          onClick={fetchBookings}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div
              key={booking.id}
              className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    {booking.booking_reference}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Booked on {formatDate(booking.created_at)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    booking.status
                  )}`}
                >
                  {booking.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-sm text-gray-600">Contact</p>
                  <p className="font-medium">{booking.contact_name}</p>
                  <p className="text-sm">{booking.contact_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Booking Details</p>
                  <p className="font-medium">
                    {booking.total_seats} seat{booking.total_seats > 1 ? 's' : ''}
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    ${booking.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>

              {booking.payment_status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Payment pending
                    {booking.expires_at &&
                      ` - Expires: ${formatDate(booking.expires_at)}`}
                  </p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() =>
                    (window.location.href = `/bookings/${booking.booking_reference}`)
                  }
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  View Details
                </button>
                {booking.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => handleDownloadTickets(booking.id)}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Tickets
                    </button>
                    <button
                      onClick={() => handleResendTickets(booking.id)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Resend Email
                    </button>
                  </>
                )}
                {(booking.status === 'pending' ||
                  booking.status === 'confirmed') && (
                  <button
                    onClick={() => handleCancelBooking(booking.id)}
                    className="px-4 py-2 text-sm border border-red-600 text-red-600 rounded-md hover:bg-red-50"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingHistory;
