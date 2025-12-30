import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import { tripAPI } from '../lib/api';
import { CityAutocomplete } from '../components/CityAutocomplete';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Container, Section } from '../components/ui/Container';
import { StaggerGrid, StaggerItem } from '../components/ui/Stagger';
import { CardSkeleton } from '../components/ui/Skeleton';
import { formatCurrency } from '../lib/utils';

interface Trip {
    id: string;
    route?: { origin: string; destination: string };
    bus?: { name: string; bus_type: string };
    start_time: string;
    price: number;
    available_seats: number;
}

export default function RoutesPage() {
    const [searchParams] = useSearchParams();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Search filters
    const [origin, setOrigin] = useState(searchParams.get('origin') || '');
    const [destination, setDestination] = useState(searchParams.get('destination') || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000000]);
    const [minSeats, setMinSeats] = useState(0);
    const [showFilters, setShowFilters] = useState(false);

    // Filtered trips
    const filteredTrips = trips.filter(trip => {
        // Origin filter
        const matchesOrigin = !origin || trip.route?.origin?.toLowerCase().includes(origin.toLowerCase());
        // Destination filter
        const matchesDestination = !destination || trip.route?.destination?.toLowerCase().includes(destination.toLowerCase());
        // Only apply price filter if it's not at max (user changed it)
        const matchesPrice = priceRange[1] === 2000000 || (trip.price >= priceRange[0] && trip.price <= priceRange[1]);
        // Only apply seats filter if user selected a minimum
        const matchesSeats = minSeats === 0 || trip.available_seats >= minSeats;
        return matchesOrigin && matchesDestination && matchesPrice && matchesSeats;
    });

    useEffect(() => {
        const fetchTrips = async () => {
            setLoading(true);
            try {
                const params: any = { date };
                if (origin) params.origin = origin;
                if (destination) params.destination = destination;
                const res = await tripAPI.search(params);
                setTrips(res.data?.data || []);
            } catch (error) {
                console.error('Failed to fetch trips:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrips();
    }, [origin, destination, date]);

    const handleSearch = () => {
        // Trigger search with current filters
        const params: any = { date };
        if (origin) params.origin = origin;
        if (destination) params.destination = destination;
        tripAPI.search(params).then(res => setTrips(res.data?.data || []));
    };

    const clearFilters = () => {
        setOrigin('');
        setDestination('');
        setDate(new Date().toISOString().split('T')[0]);
        setPriceRange([0, 2000000]);
        setMinSeats(0);
    };

    const formatPrice = (price: number) => formatCurrency(price);
    const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                </div>
                <Container className="relative">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Browse Routes</h1>
                    <p className="text-blue-100">Find the perfect route for your journey</p>
                    
                    {/* Quick Search */}
                    <Card variant="glass" className="mt-8 backdrop-blur-md">
                        <CardContent className="p-4 md:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <CityAutocomplete
                                    value={origin}
                                    onChange={setOrigin}
                                    placeholder="From"
                                    exclude={destination}
                                    icon="origin"
                                />
                                <CityAutocomplete
                                    value={destination}
                                    onChange={setDestination}
                                    placeholder="To"
                                    exclude={origin}
                                    icon="destination"
                                />
                                <div className="relative">
                                    <CalendarTodayIcon 
                                        sx={{ fontSize: 20 }} 
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                    />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <Button onClick={handleSearch} size="lg" leftIcon={<DirectionsBusIcon sx={{ fontSize: 20 }} />}>
                                    Search
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </Container>
            </div>

            <Section>
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Desktop Sidebar Filters */}
                        <div className="hidden lg:block lg:col-span-1">
                            <Card className="sticky top-24">
                                <CardContent className="p-6">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <FilterListIcon sx={{ fontSize: 20 }} />
                                        Advanced Filters
                                    </h3>

                                    <div className="space-y-6">
                                        {/* From */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                From
                                            </label>
                                            <CityAutocomplete
                                                value={origin}
                                                onChange={setOrigin}
                                                placeholder="Any city"
                                                exclude={destination}
                                                icon="origin"
                                            />
                                        </div>

                                        {/* To */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                To
                                            </label>
                                            <CityAutocomplete
                                                value={destination}
                                                onChange={setDestination}
                                                placeholder="Any city"
                                                exclude={origin}
                                                icon="destination"
                                            />
                                        </div>

                                        {/* Price Range */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                <AttachMoneyIcon sx={{ fontSize: 18 }} />
                                                Price Range
                                            </label>
                                            <div className="space-y-2">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="2000000"
                                                    step="50000"
                                                    value={priceRange[1]}
                                                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                                                />
                                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                                    <span>{formatPrice(priceRange[0])}</span>
                                                    <span>{formatPrice(priceRange[1])}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Minimum Seats */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                <EventSeatIcon sx={{ fontSize: 18 }} />
                                                Minimum Seats Available
                                            </label>
                                            <select
                                                value={minSeats}
                                                onChange={(e) => setMinSeats(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="0">Any availability</option>
                                                <option value="1">At least 1 seat</option>
                                                <option value="5">At least 5 seats</option>
                                                <option value="10">At least 10 seats</option>
                                                <option value="15">At least 15 seats</option>
                                                <option value="20">At least 20 seats</option>
                                            </select>
                                        </div>

                                        <Button 
                                            variant="outline" 
                                            className="w-full" 
                                            onClick={clearFilters}
                                        >
                                            Clear All Filters
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Mobile Filter Toggle */}
                        <div className="lg:hidden lg:col-span-1">
                            <Button
                                variant="outline"
                                className="w-full mb-4"
                                leftIcon={<FilterListIcon sx={{ fontSize: 20 }} />}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </Button>

                            {showFilters && (
                                <Card className="mb-6">
                                    <CardContent className="p-6 space-y-6">
                                        {/* From */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                From
                                            </label>
                                            <CityAutocomplete
                                                value={origin}
                                                onChange={setOrigin}
                                                placeholder="Any city"
                                                exclude={destination}
                                                icon="origin"
                                            />
                                        </div>

                                        {/* To */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                To
                                            </label>
                                            <CityAutocomplete
                                                value={destination}
                                                onChange={setDestination}
                                                placeholder="Any city"
                                                exclude={origin}
                                                icon="destination"
                                            />
                                        </div>

                                        {/* Price Range */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                <AttachMoneyIcon sx={{ fontSize: 18 }} />
                                                Price Range
                                            </label>
                                            <div className="space-y-2">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="2000000"
                                                    step="50000"
                                                    value={priceRange[1]}
                                                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                                                />
                                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                                    <span>{formatPrice(priceRange[0])}</span>
                                                    <span>{formatPrice(priceRange[1])}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Minimum Seats */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                <EventSeatIcon sx={{ fontSize: 18 }} />
                                                Minimum Seats Available
                                            </label>
                                            <select
                                                value={minSeats}
                                                onChange={(e) => setMinSeats(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="0">Any availability</option>
                                                <option value="1">At least 1 seat</option>
                                                <option value="5">At least 5 seats</option>
                                                <option value="10">At least 10 seats</option>
                                                <option value="15">At least 15 seats</option>
                                                <option value="20">At least 20 seats</option>
                                            </select>
                                        </div>

                                        <Button 
                                            variant="outline" 
                                            className="w-full" 
                                            onClick={clearFilters}
                                        >
                                            Clear All Filters
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Results */}
                        <div className="lg:col-span-3">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Available Routes
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                        {loading ? 'Searching...' : `${filteredTrips.length} ${filteredTrips.length === 1 ? 'route' : 'routes'} found`}
                                    </p>
                                </div>
                            </div>

                            {loading ? (
                                <StaggerGrid cols={1}>
                                    {[1, 2, 3, 4].map((i) => (
                                        <StaggerItem key={i}>
                                            <CardSkeleton />
                                        </StaggerItem>
                                    ))}
                                </StaggerGrid>
                            ) : filteredTrips.length > 0 ? (
                                <StaggerGrid cols={1}>
                                    {filteredTrips.map((trip) => (
                                        <StaggerItem key={trip.id}>
                                            <Card hover className="group">
                                                <CardContent className="p-6">
                                                    <Link to={`/trips/${trip.id}`} className="block">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                                                                    <LocationOnIcon sx={{ fontSize: 20 }} className="text-blue-500" />
                                                                    <span>{trip.route?.origin || 'Origin'}</span>
                                                                    <ArrowForwardIcon sx={{ fontSize: 16 }} className="text-gray-400" />
                                                                    <span>{trip.route?.destination || 'Destination'}</span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <CalendarTodayIcon sx={{ fontSize: 16 }} />
                                                                        {formatDate(trip.start_time)}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <AccessTimeIcon sx={{ fontSize: 16 }} />
                                                                        {formatTime(trip.start_time)}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <DirectionsBusIcon sx={{ fontSize: 16 }} />
                                                                        {trip.bus?.bus_type || 'Standard'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="text-right">
                                                                    <p className="text-2xl font-bold text-blue-600">{formatPrice(trip.price)}</p>
                                                                    <Badge 
                                                                        variant={trip.available_seats > 10 ? 'success' : trip.available_seats > 0 ? 'warning' : 'danger'}
                                                                        className="mt-1"
                                                                    >
                                                                        <EventSeatIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                                                        {trip.available_seats} seats
                                                                    </Badge>
                                                                </div>
                                                                <Button className="group-hover:shadow-lg transition-shadow">
                                                                    Book Now
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </CardContent>
                                            </Card>
                                        </StaggerItem>
                                    ))}
                                </StaggerGrid>
                            ) : (
                                <Card className="text-center py-16 border border-gray-200 dark:border-slate-700">
                                    <CardContent>
                                        <DirectionsBusIcon sx={{ fontSize: 64 }} className="text-gray-300 dark:text-gray-500 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No routes found</h3>
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                                            Try adjusting your search criteria or filters
                                        </p>
                                        <Button variant="outline" onClick={clearFilters}>
                                            Clear All Filters
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </Container>
            </Section>
        </div>
    );
}