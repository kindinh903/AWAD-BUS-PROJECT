import { Link, useSearchParams } from 'react-router-dom';

/**
 * PaymentFailedPage displays error message when payment fails or is cancelled.
 * Provides options to retry payment or return home.
 */
export default function PaymentFailedPage() {
    const [searchParams] = useSearchParams();

    const reason = searchParams.get('reason') || 'unknown';
    const bookingId = searchParams.get('booking_id');

    const getErrorMessage = () => {
        switch (reason) {
            case 'cancelled':
                return 'You cancelled the payment. No charges have been made.';
            case 'failed':
                return 'The payment could not be processed. Please try again or use a different payment method.';
            case 'expired':
                return 'The payment session has expired. Please create a new payment.';
            default:
                return 'An error occurred during payment. Please try again.';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
            <div className="max-w-lg mx-auto">
                {/* Error Animation */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/50 mb-4">
                        <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Payment {reason === 'cancelled' ? 'Cancelled' : 'Failed'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {getErrorMessage()}
                    </p>
                </div>

                {/* Error Details Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        What Happened?
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                            <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {reason === 'cancelled'
                                        ? 'Your payment was cancelled before completion. Your booking is still saved and you can complete payment later.'
                                        : 'There was an issue processing your payment. This could be due to insufficient funds, network issues, or card restrictions.'
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">What you can do:</h3>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Try the payment again</li>
                                <li>Use a different payment method or card</li>
                                <li>Check your bank/card balance</li>
                                <li>Contact support if the issue persists</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {bookingId && (
                        <Link
                            to={`/payment/${bookingId}`}
                            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Try Again
                        </Link>
                    )}

                    <Link
                        to="/"
                        className="block w-full py-4 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl text-center transition-all duration-300"
                    >
                        Return to Home
                    </Link>
                </div>

                {/* Support Notice */}
                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Need help? Contact support@busbooking.com
                    </div>
                </div>
            </div>
        </div>
    );
}
