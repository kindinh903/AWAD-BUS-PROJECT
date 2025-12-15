import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    MapPin, Clock, ArrowRight, Bus, Filter, Calendar
} from 'lucide-react';
import { tripAPI } from '../lib/api';

interface Trip {
    id: string;
    route?: { origin: string; destination: string };
    bus?: { name: string; bus_type: string };
    start_time: string;
    price: number;
    available_seats: number;
}

// Popular cities
const cities = [
    'Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hue', 'Nha Trang',
    'Can Tho', 'Hai Phong', 'Vung Tau', 'Da Lat', 'Quy Nhon',
    'Phan Thiet', 'Ha Long', 'Sapa', 'Hoi An'
];

export default function RoutesPage() {
    const [searchParams] = useSearchParams();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrigin, setSelectedOrigin] = useState(searchParams.get('origin') || '');
    const [selectedDestination, setSelectedDestination] = useState(searchParams.get('destination') || '');

    useEffect(() => {
        const fetchTrips = async () => {
            setLoading(true);
            try {
                // Date is required by the API
                const today = new Date().toISOString().split('T')[0];
                const params: any = { date: today };
                if (selectedOrigin) params.origin = selectedOrigin;
                if (selectedDestination) params.destination = selectedDestination;
                const res = await tripAPI.search(params);
                // API returns { data: [...trips], pagination: {...} }
                setTrips(res.data?.data || []);
            } catch (error) {
                console.error('Failed to fetch trips:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrips();
    }, [selectedOrigin, selectedDestination]);

    const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + ' ₫';
    const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
                <div className="container mx-auto px-4">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Browse Routes</h1>
                    <p className="text-blue-100">Find the perfect route for your journey</p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Filters */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm sticky top-24">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filter Routes
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        From
                                    </label>
                                    <select
                                        value={selectedOrigin}
                                        onChange={(e) => setSelectedOrigin(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">All Cities</option>
                                        {cities.map((city) => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        To
                                    </label>
                                    <select
                                        value={selectedDestination}
                                        onChange={(e) => setSelectedDestination(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">All Cities</option>
                                        {cities.map((city) => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={() => { setSelectedOrigin(''); setSelectedDestination(''); }}
                                    className="w-full py-2 text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Clear Filters
                                </button>
                            </div>

                            {/* Popular Cities */}
                            <div className="mt-8">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Popular Cities</h4>
                                <div className="flex flex-wrap gap-2">
                                    {cities.slice(0, 6).map((city) => (
                                        <button
                                            key={city}
                                            onClick={() => setSelectedOrigin(city)}
                                            className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedOrigin === city
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {city.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="lg:col-span-3">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-gray-600 dark:text-gray-400">
                                {loading ? 'Searching...' : `${trips.length} routes found`}
                            </p>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-32 animate-pulse"></div>
                                ))}
                            </div>
                        ) : trips.length > 0 ? (
                            <div className="space-y-4">
                                {trips.map((trip) => (
                                    <Link
                                        key={trip.id}
                                        to={`/trips/${trip.id}`}
                                        className="block bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-white">
                                                    <MapPin className="h-5 w-5 text-blue-500" />
                                                    <span>{trip.route?.origin || 'Origin'}</span>
                                                    <ArrowRight className="h-4 w-4 text-gray-400" />
                                                    <span>{trip.route?.destination || 'Destination'}</span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {formatDate(trip.start_time)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {formatTime(trip.start_time)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Bus className="h-4 w-4" />
                                                        {trip.bus?.bus_type || 'Standard'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-blue-600">{formatPrice(trip.price)}</p>
                                                    <p className="text-sm text-gray-500">{trip.available_seats} seats left</p>
                                                </div>
                                                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors group-hover:shadow-lg">
                                                    Book Now
                                                </button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
                                <Bus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No routes found</h3>
                                <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
