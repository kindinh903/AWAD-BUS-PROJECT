import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { tripAPI } from '../lib/api';

interface Trip {
    id: string;
    route?: {
        origin: string;
        destination: string;
    };
    bus?: {
        name: string;
        bus_type: string;
    };
    start_time: string;
    end_time: string;
    price: number;
    status: string;
    available_seats?: number;
}

interface RelatedTripsProps {
    tripId: string;
    limit?: number;
}

export default function RelatedTrips({ tripId, limit = 4 }: RelatedTripsProps) {
    const navigate = useNavigate();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRelatedTrips();
    }, [tripId]);

    const loadRelatedTrips = async () => {
        try {
            setLoading(true);
            console.log('[RelatedTrips] Loading related trips for tripId:', tripId, 'limit:', limit);
            const response = await tripAPI.getRelatedTrips(tripId, limit);
            console.log('[RelatedTrips] Response:', response.data);
            setTrips(response.data.data || []);
            console.log('[RelatedTrips] Loaded', response.data.data?.length || 0, 'trips');
        } catch (error) {
            console.error('[RelatedTrips] Failed to load related trips:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const calculateDuration = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffMs = endDate.getTime() - startDate.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const handleTripClick = (trip: Trip) => {
        // Navigate to trip details page
        console.log('[RelatedTrips] Clicking trip:', {
            id: trip.id,
            route: trip.route,
            startTime: trip.start_time,
            price: trip.price
        });
        navigate(`/trips/${trip.id}`);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-lg mb-4">Other Trips on This Route</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse border rounded-lg p-4">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (trips.length === 0) {
        return null; // Don't show section if no related trips
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
                <DirectionsBusIcon sx={{ fontSize: 20 }} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-lg dark:text-white">Other Trips on This Route</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trips.map((trip) => (
                    <div
                        key={trip.id}
                        onClick={() => handleTripClick(trip)}
                        className="border dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group bg-white dark:bg-gray-700"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <AccessTimeIcon sx={{ fontSize: 16 }} />
                                <span>{formatDate(trip.start_time)}</span>
                            </div>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {trip.price}₫
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium dark:text-white">{formatTime(trip.start_time)}</span>
                            <ArrowForwardIcon sx={{ fontSize: 16 }} className="text-gray-400 dark:text-gray-500" />
                            <span className="font-medium dark:text-white">{formatTime(trip.end_time)}</span>
                            <span className="text-sm text-gray-400 dark:text-gray-500 ml-2">
                                ({calculateDuration(trip.start_time, trip.end_time)})
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span>{trip.bus?.bus_type || 'Standard'}</span>
                            <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                View Details →
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
