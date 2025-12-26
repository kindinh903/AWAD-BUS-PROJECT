import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { paymentAPI, bookingAPI } from '../lib/api';
import QRCode from 'qrcode';

interface PaymentData {
    payment_id: string;
    checkout_url: string;
    qr_code_url?: string;
    status: string;
}

interface BookingData {
    id: string;
    booking_reference: string;
    contact_name: string;
    contact_email: string;
    total_amount: number;
    total_price?: number;
    status: string;
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
 * PaymentPage handles the payment initiation and status polling flow.
 * - Shows booking summary
 * - Creates payment and redirects to payment gateway OR shows mock payment
 * - Polls for payment status when returning from gateway
 */
export default function PaymentPage() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [booking, setBooking] = useState<BookingData | null>(null);
    const [payment, setPayment] = useState<PaymentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [polling, setPolling] = useState(false);
    const [qrDataURL, setQrDataURL] = useState<string | null>(null);

    // Check if we're returning from payment gateway
    const paymentId = searchParams.get('payment_id');

    // Fetch booking details
    useEffect(() => {
        const fetchBooking = async () => {
            if (!bookingId) {
                setError('No booking ID provided');
                setLoading(false);
                return;
            }

            try {
                // Get booking reference from URL
                const reference = searchParams.get('ref') || localStorage.getItem('lastBookingRef');
                
                if (reference) {
                    // Fetch booking by reference
                    const res = await bookingAPI.getByReference(reference);
                    console.log('Full API response:', res.data);
                    
                    // API returns {booking: {...}, passengers: [...], tickets: [...]}
                    const apiData = res.data?.data || res.data;
                    const bookingData = apiData?.booking || apiData;
                    
                    console.log('Booking data:', bookingData);
                    console.log('Total amount:', bookingData?.total_amount);
                    setBooking(bookingData);
                } else {
                    setError('No booking reference found');
                }

                // Try to get existing payments for this booking
                try {
                    const paymentsRes = await paymentAPI.getBookingPayments(bookingId);
                    if (paymentsRes.data?.payments?.length > 0) {
                        const existingPayment = paymentsRes.data.payments[0];
                        setPayment({
                            payment_id: existingPayment.id,
                            checkout_url: existingPayment.checkout_url,
                            qr_code_url: existingPayment.qr_code_url,
                            status: existingPayment.status,
                        });
                    }
                } catch (paymentError) {
                    console.log('No existing payments found');
                }
                
            } catch (err: any) {
                console.error('Fetch booking error:', err);
                setError(err.response?.data?.error || 'Failed to load booking');
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [bookingId, searchParams]);

    // Generate QR code image when payment data changes
    useEffect(() => {
        if (payment?.qr_code_url) {
            // Check if it's already a URL (starts with http)
            if (payment.qr_code_url.startsWith('http')) {
                setQrDataURL(payment.qr_code_url);
            } else {
                // It's raw QR data, generate QR code image
                QRCode.toDataURL(payment.qr_code_url, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                })
                    .then(url => {
                        setQrDataURL(url);
                    })
                    .catch(err => {
                        console.error('Failed to generate QR code:', err);
                        setQrDataURL(null);
                    });
            }
        } else {
            setQrDataURL(null);
        }
    }, [payment?.qr_code_url]);

    // 
    // Poll payment status when we have a payment_id
    useEffect(() => {
        if (!paymentId || !polling) return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await paymentAPI.getPaymentStatus(paymentId);
                const status = res.data;

                if (status.is_paid) {
                    clearInterval(pollInterval);
                    navigate('/payment/success?booking_id=' + bookingId);
                } else if (status.status === 'failed' || status.status === 'cancelled') {
                    clearInterval(pollInterval);
                    navigate('/payment/failed?reason=' + status.status);
                }
            } catch (err) {
                console.error('Payment polling error:', err);
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(pollInterval);
    }, [paymentId, polling, bookingId, navigate]);

    // Create payment and redirect
    const handlePayNow = async () => {
        if (!bookingId) return;

        setProcessing(true);
        setError(null);

        try {
            const returnUrl = window.location.origin + '/payment/success';
            const cancelUrl = window.location.origin + '/payment/failed';

            const res = await paymentAPI.createPayment(bookingId, returnUrl, cancelUrl);
            const { checkout_url, qr_code_url, payment } = res.data;

            if (checkout_url) {
                // Set payment data with QR code
                setPayment({
                    payment_id: payment.id,
                    checkout_url: checkout_url,
                    qr_code_url: qr_code_url,
                    status: payment.status,
                });
                // Don't auto-redirect - let user choose between QR or redirect
                setPolling(true);
            } else if (payment) {
                setPayment({
                    payment_id: payment.id,
                    checkout_url: payment.checkout_url || '',
                    qr_code_url: payment.qr_code_url,
                    status: payment.status,
                });
                setPolling(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create payment');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Complete Payment
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Secure payment for your bus ticket
                    </p>
                </div>

                {/* Booking Summary Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Booking Summary
                    </h2>

                    {booking ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Reference</span>
                                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                    {booking.booking_reference || 'N/A'}
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
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Passengers</span>
                                <span className="text-gray-900 dark:text-white">
                                    {booking.passengers?.length || 0}
                                </span>
                            </div>
                            <div className="border-t dark:border-gray-700 pt-3 mt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Amount</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {booking.total_amount 
                                            ? booking.total_amount.toLocaleString('vi-VN') + ' ₫'
                                            : (booking.total_price 
                                                ? booking.total_price.toLocaleString('vi-VN') + ' ₫'
                                                : 'N/A'
                                            )
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">Loading booking details...</p>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Payment Status */}
                {payment && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-lg mb-6 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="text-blue-900 dark:text-blue-300 font-semibold mb-1">
                                    Payment Status: <span className="capitalize">{payment.status}</span>
                                </div>
                                {polling && (
                                    <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        Waiting for payment confirmation...
                                    </div>
                                )}
                                
                                {/* QR Code Display */}
                                {qrDataURL && (
                                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 text-center font-medium">
                                            📱 Scan QR Code to Pay
                                        </div>
                                        <div className="flex justify-center">
                                            <img 
                                                src={qrDataURL} 
                                                alt="Payment QR Code" 
                                                className="w-64 h-64 object-contain rounded-lg shadow-md"
                                            />
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                                            Use your banking app to scan and complete payment
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Pay Button */}
                {!payment?.checkout_url && (
                    <button
                        onClick={handlePayNow}
                        disabled={processing || !booking}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Pay Now
                            </>
                        )}
                    </button>
                )}

                {/* Redirect to checkout if we have URL */}
                {payment?.checkout_url && (
                    <a
                        href={payment.checkout_url}
                        className="block w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg text-center transition-all duration-300"
                    >
                        Continue to Payment Gateway
                    </a>
                )}

                {/* Security Notice */}
                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Secure Payment
                    </div>
                    Your payment is processed securely via PayOS
                </div>
            </div>
        </div>
    );
}
