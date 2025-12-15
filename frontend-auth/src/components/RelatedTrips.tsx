import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Clock, ArrowRight } from 'lucide-react';
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
            const response = await tripAPI.getRelatedTrips(tripId, limit);
            setTrips(response.data.data || []);
        } catch (error) {
            console.error('Failed to load related trips:', error);
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
        // Navigate to trip details with the trip data
        navigate('/trip-details', {
            state: {
                trip: {
                    id: trip.id,
                    from: trip.route?.origin || 'Unknown',
                    to: trip.route?.destination || 'Unknown',
                    departure: formatTime(trip.start_time),
                    arrival: formatTime(trip.end_time),
                    duration: calculateDuration(trip.start_time, trip.end_time),
                    price: trip.price,
                    company: trip.bus?.name || 'Bus',
                    busType: trip.bus?.bus_type || 'Standard',
                    availableSeats: trip.available_seats || 0,
                    totalSeats: 40,
                    amenities: ['WiFi', 'AC', 'USB Charging'],
                },
            },
        });
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
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
                <Bus className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Other Trips on This Route</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trips.map((trip) => (
                    <div
                        key={trip.id}
                        onClick={() => handleTripClick(trip)}
                        className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>{formatDate(trip.start_time)}</span>
                            </div>
                            <span className="text-lg font-bold text-blue-600">
                                ${trip.price}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{formatTime(trip.start_time)}</span>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{formatTime(trip.end_time)}</span>
                            <span className="text-sm text-gray-400 ml-2">
                                ({calculateDuration(trip.start_time, trip.end_time)})
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{trip.bus?.bus_type || 'Standard'}</span>
                            <span className="group-hover:text-blue-600 transition-colors">
                                View Details →
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
