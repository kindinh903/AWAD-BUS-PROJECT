import { useState, useEffect } from 'react';
import api from '../lib/api';

interface NotificationPreference {
    email_enabled: boolean;
    sms_enabled: boolean;
    booking_confirmation: boolean;
    trip_reminders: boolean;
    payment_updates: boolean;
    promotional: boolean;
}

/**
 * NotificationPreferences component for managing user notification settings.
 * Allows users to toggle email/SMS notifications for different event types.
 */
export default function NotificationPreferences() {
    const [preferences, setPreferences] = useState<NotificationPreference>({
        email_enabled: true,
        sms_enabled: false,
        booking_confirmation: true,
        trip_reminders: true,
        payment_updates: true,
        promotional: false,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch current preferences on mount
    useEffect(() => {
        const fetchPreferences = async () => {
            setLoading(true);
            try {
                const res = await api.get('/profile/notifications');
                if (res.data?.preferences) {
                    setPreferences(res.data.preferences);
                }
            } catch (err) {
                // Use defaults if API not available
                console.log('Using default notification preferences');
            } finally {
                setLoading(false);
            }
        };
        fetchPreferences();
    }, []);

    const handleToggle = (key: keyof NotificationPreference) => {
        setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
        setMessage(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.put('/profile/notifications', { preferences });
            setMessage({ type: 'success', text: 'Preferences saved successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save preferences' });
        } finally {
            setSaving(false);
        }
    };

    const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
        <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notification Preferences
            </h2>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-3 rounded-lg ${message.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Channels */}
            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Notification Channels
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates via email</p>
                        </div>
                        <Toggle enabled={preferences.email_enabled} onToggle={() => handleToggle('email_enabled')} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">SMS Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates via SMS</p>
                        </div>
                        <Toggle enabled={preferences.sms_enabled} onToggle={() => handleToggle('sms_enabled')} />
                    </div>
                </div>
            </div>

            {/* Event Types */}
            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Notification Types
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Booking Confirmations</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when a booking is confirmed</p>
                        </div>
                        <Toggle enabled={preferences.booking_confirmation} onToggle={() => handleToggle('booking_confirmation')} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Trip Reminders</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Get reminders before your trip</p>
                        </div>
                        <Toggle enabled={preferences.trip_reminders} onToggle={() => handleToggle('trip_reminders')} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Payment Updates</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about payment status</p>
                        </div>
                        <Toggle enabled={preferences.payment_updates} onToggle={() => handleToggle('payment_updates')} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Promotional</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Receive special offers and discounts</p>
                        </div>
                        <Toggle enabled={preferences.promotional} onToggle={() => handleToggle('promotional')} />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {saving ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Saving...
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Preferences
                    </>
                )}
            </button>
        </div>
    );
}
