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
import CloseIcon from '@mui/icons-material/Close';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import LightModeIcon from '@mui/icons-material/LightMode';
import Brightness3Icon from '@mui/icons-material/Brightness3';
import NightsStayIcon from '@mui/icons-material/NightsStay';
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
    const [busTypes, setBusTypes] = useState<string[]>([]);
    const [departureTime, setDepartureTime] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    // Time range helper
    const getHourFromTime = (dateString: string) => {
        return new Date(dateString).getHours();
    };

    const matchesDepartureTime = (trip: Trip) => {
        if (departureTime.length === 0) return true;
        const hour = getHourFromTime(trip.start_time);
        return departureTime.some(time => {
            if (time === 'morning' && hour >= 6 && hour < 12) return true;
            if (time === 'afternoon' && hour >= 12 && hour < 18) return true;
            if (time === 'evening' && hour >= 18 && hour < 22) return true;
            if (time === 'night' && (hour >= 22 || hour < 6)) return true;
            return false;
        });
    };

    // Filtered trips
    const filteredTrips = trips.filter(trip => {
        // Origin filter
        const matchesOrigin = !origin || trip.route?.origin?.toLowerCase().includes(origin.toLowerCase());
        // Destination filter
        const matchesDestination = !destination || trip.route?.destination?.toLowerCase().includes(destination.toLowerCase());
        // Price filter
        const matchesPrice = trip.price >= priceRange[0] && trip.price <= priceRange[1];
        // Seats filter
        const matchesSeats = minSeats === 0 || trip.available_seats >= minSeats;
        // Bus type filter
        const matchesBusType = busTypes.length === 0 || busTypes.includes(trip.bus?.bus_type?.toLowerCase() || 'standard');
        // Departure time filter
        const matchesTime = matchesDepartureTime(trip);
        
        return matchesOrigin && matchesDestination && matchesPrice && matchesSeats && matchesBusType && matchesTime;
    });

    // Count active filters
    const activeFiltersCount = 
        (origin ? 1 : 0) + 
        (destination ? 1 : 0) + 
        (priceRange[0] > 0 || priceRange[1] < 2000000 ? 1 : 0) + 
        (minSeats > 0 ? 1 : 0) +
        busTypes.length +
        departureTime.length;

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
        setBusTypes([]);
        setDepartureTime([]);
    };

    const toggleBusType = (type: string) => {
        setBusTypes(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const toggleDepartureTime = (time: string) => {
        setDepartureTime(prev => 
            prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
        );
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Browse Trips</h1>
                    <p className="text-blue-100">Find the perfect trip for your journey</p>
                    
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
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <FilterListIcon sx={{ fontSize: 20 }} />
                                            Filters
                                            {activeFiltersCount > 0 && (
                                                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                                    {activeFiltersCount}
                                                </span>
                                            )}
                                        </h3>
                                        {activeFiltersCount > 0 && (
                                            <button 
                                                onClick={clearFilters}
                                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                                            >
                                                Clear All
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {/* From */}
                                        <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                Departure City
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
                                        <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                Arrival City
                                            </label>
                                            <CityAutocomplete
                                                value={destination}
                                                onChange={setDestination}
                                                placeholder="Any city"
                                                exclude={origin}
                                                icon="destination"
                                            />
                                        </div>

                                        {/* Bus Type */}
                                        <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                <DirectionsBusIcon sx={{ fontSize: 16 }} className="inline mr-1" />
                                                Bus Type
                                            </label>
                                            <div className="space-y-2">
                                                {[
                                                    { value: 'standard', label: 'Standard' },
                                                    { value: 'vip', label: 'VIP' },
                                                    { value: 'sleeper', label: 'Sleeper' }
                                                ].map(type => (
                                                    <label
                                                        key={type.value}
                                                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={busTypes.includes(type.value)}
                                                            onChange={() => toggleBusType(type.value)}
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                                            {type.label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Departure Time */}
                                        <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                <AccessTimeIcon sx={{ fontSize: 16 }} className="inline mr-1" />
                                                Departure Time
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { value: 'morning', label: 'Morning', icon: <WbSunnyIcon sx={{ fontSize: 16 }} />, time: '6AM-12PM' },
                                                    { value: 'afternoon', label: 'Afternoon', icon: <LightModeIcon sx={{ fontSize: 16 }} />, time: '12PM-6PM' },
                                                    { value: 'evening', label: 'Evening', icon: <Brightness3Icon sx={{ fontSize: 16 }} />, time: '6PM-10PM' },
                                                    { value: 'night', label: 'Night', icon: <NightsStayIcon sx={{ fontSize: 16 }} />, time: '10PM-6AM' }
                                                ].map(time => (
                                                    <button
                                                        key={time.value}
                                                        onClick={() => toggleDepartureTime(time.value)}
                                                        className={`p-3 rounded-lg border transition-all text-left ${
                                                            departureTime.includes(time.value)
                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1 mb-1">
                                                            {time.icon}
                                                            <span className="text-xs font-medium">{time.label}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-600 dark:text-gray-400">{time.time}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Price Range */}
                                        <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                <AttachMoneyIcon sx={{ fontSize: 16 }} className="inline mr-1" />
                                                Price Range
                                            </label>
                                            <div className="space-y-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="2000000"
                                                    step="50000"
                                                    value={priceRange[1]}
                                                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                                                />
                                                <div className="flex items-center justify-between">
                                                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 block">Min</span>
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {formatPrice(priceRange[0])}
                                                        </span>
                                                    </div>
                                                    <span className="text-gray-400">—</span>
                                                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 block">Max</span>
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {formatPrice(priceRange[1])}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Minimum Seats */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                <EventSeatIcon sx={{ fontSize: 16 }} className="inline mr-1" />
                                                Available Seats
                                            </label>
                                            <select
                                                value={minSeats}
                                                onChange={(e) => setMinSeats(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="0">Any availability</option>
                                                <option value="1">At least 1 seat</option>
                                                <option value="5">At least 5 seats</option>
                                                <option value="10">At least 10 seats</option>
                                                <option value="15">At least 15 seats</option>
                                                <option value="20">At least 20 seats</option>
                                            </select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Mobile Filter Toggle */}
                        <div className="lg:hidden lg:col-span-1">
                            <Button
                                variant="outline"
                                className="w-full mb-4 relative"
                                leftIcon={<FilterListIcon sx={{ fontSize: 20 }} />}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                                {activeFiltersCount > 0 && (
                                    <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>

                            {showFilters && (
                                <Card className="mb-6">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
                                            {activeFiltersCount > 0 && (
                                                <button 
                                                    onClick={clearFilters}
                                                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-6">
                                            {/* From */}
                                            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                    Departure City
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
                                            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                    Arrival City
                                                </label>
                                                <CityAutocomplete
                                                    value={destination}
                                                    onChange={setDestination}
                                                    placeholder="Any city"
                                                    exclude={origin}
                                                    icon="destination"
                                                />
                                            </div>

                                            {/* Bus Type */}
                                            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                    <DirectionsBusIcon sx={{ fontSize: 16 }} className="inline mr-1" />
                                                    Bus Type
                                                </label>
                                                <div className="space-y-2">
                                                    {[
                                                        { value: 'standard', label: 'Standard' },
                                                        { value: 'vip', label: 'VIP' },
                                                        { value: 'sleeper', label: 'Sleeper' }
                                                    ].map(type => (
                                                        <label
                                                            key={type.value}
                                                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={busTypes.includes(type.value)}
                                                                onChange={() => toggleBusType(type.value)}
                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                                                {type.label}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Departure Time */}
                                            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                    <AccessTimeIcon sx={{ fontSize: 16 }} className="inline mr-1" />
                                                    Departure Time
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { value: 'morning', label: 'Morning', icon: <WbSunnyIcon sx={{ fontSize: 16 }} />, time: '6AM-12PM' },
                                                        { value: 'afternoon', label: 'Afternoon', icon: <LightModeIcon sx={{ fontSize: 16 }} />, time: '12PM-6PM' },
                                                        { value: 'evening', label: 'Evening', icon: <Brightness3Icon sx={{ fontSize: 16 }} />, time: '6PM-10PM' },
                                                        { value: 'night', label: 'Night', icon: <NightsStayIcon sx={{ fontSize: 16 }} />, time: '10PM-6AM' }
                                                    ].map(time => (
                                                        <button
                                                            key={time.value}
                                                            onClick={() => toggleDepartureTime(time.value)}
                                                            className={`p-3 rounded-lg border transition-all text-left ${
                                                                departureTime.includes(time.value)
                                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-1 mb-1">
                                                                {time.icon}
                                                                <span className="text-xs font-medium">{time.label}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-600 dark:text-gray-400">{time.time}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Price Range */}
                                            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                    <AttachMoneyIcon sx={{ fontSize: 16 }} className="inline mr-1" />
                                                    Price Range
                                                </label>
                                                <div className="space-y-3">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="2000000"
                                                        step="50000"
                                                        value={priceRange[1]}
                                                        onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                                                    />
                                                    <div className="flex items-center justify-between">
                                                        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 block">Min</span>
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {formatPrice(priceRange[0])}
                                                            </span>
                                                        </div>
                                                        <span className="text-gray-400">—</span>
                                                        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 block">Max</span>
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {formatPrice(priceRange[1])}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Minimum Seats */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                                                    <EventSeatIcon sx={{ fontSize: 16 }} className="inline mr-1" />
                                                    Available Seats
                                                </label>
                                                <select
                                                    value={minSeats}
                                                    onChange={(e) => setMinSeats(parseInt(e.target.value))}
                                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="0">Any availability</option>
                                                    <option value="1">At least 1 seat</option>
                                                    <option value="5">At least 5 seats</option>
                                                    <option value="10">At least 10 seats</option>
                                                    <option value="15">At least 15 seats</option>
                                                    <option value="20">At least 20 seats</option>
                                                </select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Results */}
                        <div className="lg:col-span-3">
                            {/* Active Filters Display */}
                            {activeFiltersCount > 0 && (
                                <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Active Filters ({activeFiltersCount})
                                        </span>
                                        <button 
                                            onClick={clearFilters}
                                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1"
                                        >
                                            <CloseIcon sx={{ fontSize: 14 }} />
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {origin && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                                                <LocationOnIcon sx={{ fontSize: 14 }} />
                                                From: {origin}
                                                <button onClick={() => setOrigin('')} className="ml-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-0.5">
                                                    <CloseIcon sx={{ fontSize: 12 }} />
                                                </button>
                                            </span>
                                        )}
                                        {destination && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                                                <LocationOnIcon sx={{ fontSize: 14 }} />
                                                To: {destination}
                                                <button onClick={() => setDestination('')} className="ml-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-0.5">
                                                    <CloseIcon sx={{ fontSize: 12 }} />
                                                </button>
                                            </span>
                                        )}
                                        {busTypes.map(type => (
                                            <span key={type} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm capitalize">
                                                <DirectionsBusIcon sx={{ fontSize: 14 }} />
                                                {type}
                                                <button onClick={() => toggleBusType(type)} className="ml-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-0.5">
                                                    <CloseIcon sx={{ fontSize: 12 }} />
                                                </button>
                                            </span>
                                        ))}
                                        {departureTime.map(time => (
                                            <span key={time} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm capitalize">
                                                <AccessTimeIcon sx={{ fontSize: 14 }} />
                                                {time}
                                                <button onClick={() => toggleDepartureTime(time)} className="ml-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-0.5">
                                                    <CloseIcon sx={{ fontSize: 12 }} />
                                                </button>
                                            </span>
                                        ))}
                                        {(priceRange[0] > 0 || priceRange[1] < 2000000) && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                                                <AttachMoneyIcon sx={{ fontSize: 14 }} />
                                                {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                                                <button onClick={() => setPriceRange([0, 2000000])} className="ml-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-0.5">
                                                    <CloseIcon sx={{ fontSize: 12 }} />
                                                </button>
                                            </span>
                                        )}
                                        {minSeats > 0 && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                                                <EventSeatIcon sx={{ fontSize: 14 }} />
                                                Min {minSeats} seats
                                                <button onClick={() => setMinSeats(0)} className="ml-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-0.5">
                                                    <CloseIcon sx={{ fontSize: 12 }} />
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Available Trips
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                        {loading ? 'Searching...' : `${filteredTrips.length} ${filteredTrips.length === 1 ? 'trip' : 'trips'} found`}
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
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No trips found</h3>
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