import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import StarIcon from '@mui/icons-material/Star';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ExploreIcon from '@mui/icons-material/Explore';
import WifiIcon from '@mui/icons-material/Wifi';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import UsbIcon from '@mui/icons-material/Usb';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import { userSummaryCards, BusTrip } from '../lib/mockData';
import { TripFilters, TripFiltersState, doesTripMatchFilters, sortTrips } from './TripFilters';
import { tripAPI } from '../lib/api';
import { CityAutocomplete } from './CityAutocomplete';
import { formatCurrency } from '../lib/utils';

// Helper function to calculate duration between two timestamps
const calculateDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

interface UserDashboardProps {
  user: any;
}

// Mock booking data
const mockBookings = [
  {
    id: '1',
    from: 'Ho Chi Minh',
    to: 'Da Nang',
    date: '2024-12-25',
    time: '08:30',
    status: 'confirmed',
    price: 25.0,
  },
  {
    id: '2',
    from: 'Hanoi',
    to: 'Hai Phong',
    date: '2024-12-20',
    time: '14:15',
    status: 'completed',
    price: 15.0,
  },
  {
    id: '3',
    from: 'Da Nang',
    to: 'Hue',
    date: '2024-12-15',
    time: '10:00',
    status: 'completed',
    price: 12.0,
  },
];

export const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [bookingForm, setBookingForm] = useState({
    from: 'Ho Chi Minh City',
    to: 'Da Nang',
    date: '2025-12-08',
    time: 'morning',
  });
  const [recentBookings] = useState(mockBookings);
  const [summaryData] = useState(userSummaryCards);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<BusTrip[]>([]);
  const navigate = useNavigate();

  // Load saved filters from localStorage or use defaults
  const loadSavedFilters = (): TripFiltersState => {
    try {
      const saved = localStorage.getItem('tripFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
    
    return {
      priceRange: { min: 0, max: 100 },
      timeSlots: [],
      busTypes: [],
      amenities: [],
      sortBy: 'price',
      sortOrder: 'asc',
    };
  };

  const [filters, setFilters] = useState<TripFiltersState>(loadSavedFilters());

  // Save filters to localStorage whenever they change
  const handleFiltersChange = (newFilters: TripFiltersState) => {
    setFilters(newFilters);
    try {
      localStorage.setItem('tripFilters', JSON.stringify(newFilters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  };

  // Check for search data from homepage on component mount
  React.useEffect(() => {
    const searchData = localStorage.getItem('busSearch');
    if (searchData) {
      try {
        const parsed = JSON.parse(searchData);
        setBookingForm(prev => ({
          ...prev,
          from: parsed.from || prev.from,
          to: parsed.to || prev.to,
          date: parsed.date || prev.date,
        }));
        
        // Auto-trigger search if we have valid data
        if (parsed.from && parsed.to) {
          // Clear the stored search to prevent auto-search on future visits
          localStorage.removeItem('busSearch');
          // Trigger search after a short delay to ensure state is updated
          setTimeout(() => {
            handleSearchWithData(parsed.from, parsed.to);
          }, 100);
        }
      } catch (error) {
        console.error('Error parsing search data:', error);
        localStorage.removeItem('busSearch');
      }
    }
  }, []);

  // Handle search with specific data
  const handleSearchWithData = async (from: string, to: string) => {
    setIsSearching(true);
    setShowResults(false);

    try {
      const response = await tripAPI.search({
        origin: from,
        destination: to,
        date: bookingForm.date,
      });

      const trips = response.data.data || [];
      
      // Transform backend trips to match BusTrip interface
      const searchResults: BusTrip[] = trips.map((trip: any) => ({
        id: trip.id,
        from: trip.route?.origin || from,
        to: trip.route?.destination || to,
        departure: new Date(trip.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        arrival: new Date(trip.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        duration: calculateDuration(trip.start_time, trip.end_time),
        price: trip.price,
        busType: 'Standard' as const,
        company: trip.bus?.company || 'Bus Company',
        availableSeats: 40,
        totalSeats: trip.bus?.total_seats || 45,
        amenities: ['WiFi', 'AC'],
        rating: 4.5,
      }));

      setAvailableTrips(searchResults);

      // Update price range in filters based on actual available trips
      const minPrice = searchResults.length > 0 ? Math.min(...searchResults.map(t => t.price)) : 0;
      const maxPrice = searchResults.length > 0 ? Math.max(...searchResults.map(t => t.price)) : 100;
    
      const updatedFilters = {
        ...filters,
        priceRange: { min: minPrice, max: maxPrice },
      };
      
      handleFiltersChange(updatedFilters);
    } catch (error) {
      console.error('Search failed:', error);
      setAvailableTrips([]);
      alert('Failed to search trips. Please try again.');
    } finally {
      setShowResults(true);
      setIsSearching(false);
    }
  };

  // Filter and sort trips
  const filteredTrips = useMemo(() => {
    // Apply filters
    const filtered = availableTrips.filter(trip => doesTripMatchFilters(trip, filters));
    
    // Sort trips
    return sortTrips(filtered, filters);
  }, [availableTrips, filters]);

  const handleSearch = async () => {
    if (!bookingForm.from || !bookingForm.to) {
      alert('Please enter departure and destination cities');
      return;
    }

    await handleSearchWithData(bookingForm.from, bookingForm.to);
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <WifiIcon sx={{ fontSize: 16 }} />;
      case 'ac':
        return <AcUnitIcon sx={{ fontSize: 16 }} />;
      case 'usb charging':
        return <UsbIcon sx={{ fontSize: 16 }} />;
      case 'snacks':
        return <LocalCafeIcon sx={{ fontSize: 16 }} />;
      default:
        return <span className="text-xs">•</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6 transition-colors duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white p-6 rounded-xl shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <PersonIcon sx={{ fontSize: 32 }} />
              My Travel Dashboard
            </h1>
            <p className="text-blue-100 mt-2">
              Welcome back, {user?.name || 'Traveler'}! Ready for your next
              journey?
            </p>
          </div>
          <div className="text-right">
            <div className="bg-blue-700 dark:bg-blue-800 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold">PASSENGER</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {summaryData.map(card => {
          const IconMap: { [key: string]: any } = {
            'total-bookings': DirectionsBusIcon,
            'upcoming-trips': ExploreIcon,
            'total-spent': StarIcon,
          };
          const IconComponent = IconMap[card.id] || DirectionsBusIcon;
          const colorClasses = {
            blue: 'border-blue-500 text-blue-500',
            green: 'border-green-500 text-green-500',
            orange: 'border-orange-500 text-orange-500',
            red: 'border-red-500 text-red-500',
          };

          return (
            <div
              key={card.id}
              className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 ${colorClasses[card.color].split(' ')[0]}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
                <IconComponent
                  sx={{ fontSize: 32 }}
                  className={colorClasses[card.color].split(' ')[1]}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Book New Trip */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ConfirmationNumberIcon sx={{ fontSize: 24 }} className="text-blue-600 dark:text-blue-400" />
            Book Your Next Trip
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From
                </label>
                <CityAutocomplete
                  value={bookingForm.from}
                  onChange={(value) => setBookingForm(prev => ({ ...prev, from: value }))}
                  placeholder="Departure city"
                  exclude={bookingForm.to}
                  icon="origin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To
                </label>
                <CityAutocomplete
                  value={bookingForm.to}
                  onChange={(value) => setBookingForm(prev => ({ ...prev, to: value }))}
                  placeholder="Destination city"
                  exclude={bookingForm.from}
                  icon="destination"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <div className="relative">
                  <CalendarTodayIcon sx={{ fontSize: 16 }} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
                  <input
                    type="date"
                    value={bookingForm.date}
                    onChange={e =>
                      setBookingForm(prev => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time
                </label>
                <div className="relative">
                  <AccessTimeIcon sx={{ fontSize: 16 }} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
                  <select
                    value={bookingForm.time}
                    onChange={e =>
                      setBookingForm(prev => ({
                        ...prev,
                        time: e.target.value,
                      }))
                    }
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="morning">Morning (6-12)</option>
                    <option value="afternoon">Afternoon (12-18)</option>
                    <option value="evening">Evening (18-24)</option>
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-white py-3 rounded-lg font-semibold transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSearching && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isSearching ? 'Searching...' : 'Search Buses'}
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AccessTimeIcon sx={{ fontSize: 24 }} className="text-green-600 dark:text-green-400" />
            Recent Bookings
          </h2>
          <div className="space-y-3">
            {recentBookings.map(booking => {
              const statusStyles = {
                confirmed: 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-700 text-green-700 dark:text-green-300',
                completed: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-700 text-blue-700 dark:text-blue-300',
                cancelled: 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-700 text-red-700 dark:text-red-300',
              };

              const statusLabels = {
                confirmed: '✓ Confirmed',
                completed: '✓ Completed',
                cancelled: '✗ Cancelled',
              };

              return (
                <div
                  key={booking.id}
                  className={`p-4 rounded-lg border-l-4 ${statusStyles[booking.status as keyof typeof statusStyles]}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold dark:text-gray-200">
                        {booking.from} → {booking.to}
                      </div>
                      <div className="text-sm opacity-75 dark:text-gray-400">
                        {booking.date} • {booking.time}
                      </div>
                      <div className="text-xs mt-1">
                        {
                          statusLabels[
                            booking.status as keyof typeof statusLabels
                          ]
                        }
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold dark:text-gray-200">
                        {formatCurrency(booking.price)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center">
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
              View All Bookings
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowResults(false)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
              >
                ← New Search
              </button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DirectionsBusIcon sx={{ fontSize: 24 }} className="text-blue-600 dark:text-blue-400" />
                Available Buses ({filteredTrips.length} results)
              </h2>
            </div>

          </div>

          {/* Advanced Filters */}
          <TripFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            minPrice={availableTrips.length > 0 ? Math.min(...availableTrips.map(t => t.price)) : 0}
            maxPrice={availableTrips.length > 0 ? Math.max(...availableTrips.map(t => t.price)) : 100}
            className="mb-4"
          />

          {/* Trip Results */}
          <div className="space-y-4">
            {filteredTrips.length === 0 ? (
              <div className="text-center py-8">
                <DirectionsBusIcon sx={{ fontSize: 48 }} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No buses found for your search criteria.
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            ) : (
              filteredTrips.map(trip => (
                <div
                  key={trip.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="font-bold text-lg dark:text-white">
                              {trip.departure}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {trip.from}
                            </div>
                          </div>
                          <div className="flex-1 text-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {trip.duration}
                            </div>
                            <div className="border-t border-gray-300 dark:border-gray-600 my-1"></div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {trip.company}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg dark:text-white">
                              {trip.arrival}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {trip.to}
                            </div>
                          </div>
                        </div>

                        <div className="text-right ml-6">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(trip.price)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {trip.availableSeats}/{trip.totalSeats} seats
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              trip.busType === 'VIP'
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                : trip.busType === 'Sleeper'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {trip.busType}
                          </span>

                          <div className="flex items-center gap-1">
                            <StarIcon sx={{ fontSize: 16 }} className="text-yellow-400 fill-current" />
                            <span className="text-sm font-medium dark:text-gray-200">
                              {trip.rating}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {trip.amenities
                              .slice(0, 4)
                              .map((amenity: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                                >
                                  {getAmenityIcon(amenity)}
                                  <span>{amenity}</span>
                                </div>
                              ))}
                            {trip.amenities.length > 4 && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                +{trip.amenities.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>

                          <button
                            onClick={() => navigate(`/trips/${trip.id}`, { state: { trip } })}
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                          >
                            Book Now
                          </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!showResults && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => alert('Payment methods feature coming soon!')}
              className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900 rounded-lg hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-900 dark:hover:to-blue-800 transition-all duration-200 text-center border border-transparent dark:border-blue-800"
            >
              <div className="text-2xl mb-2">💳</div>
              <div className="font-semibold text-blue-700 dark:text-blue-100">Payment Methods</div>
              <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Manage cards & wallets
              </div>
            </button>

            <button
              onClick={() => alert('Loyalty program: You have 2,450 points!')}
              className="p-4 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-950 dark:to-green-900 rounded-lg hover:from-green-200 hover:to-green-300 dark:hover:from-green-900 dark:hover:to-green-800 transition-all duration-200 text-center border border-transparent dark:border-green-800"
            >
              <StarIcon sx={{ fontSize: 32 }} className="text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="font-semibold text-green-700 dark:text-green-100">
                Loyalty Program
              </div>
              <div className="text-xs text-green-600 dark:text-green-300 mt-1">
                View points & rewards
              </div>
            </button>

            <button
              onClick={() => alert('Profile settings feature coming soon!')}
              className="p-4 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-950 dark:to-orange-900 rounded-lg hover:from-orange-200 hover:to-orange-300 dark:hover:from-orange-900 dark:hover:to-orange-800 transition-all duration-200 text-center border border-transparent dark:border-orange-800"
            >
              <PersonIcon sx={{ fontSize: 32 }} className="text-orange-600 dark:text-orange-400 mx-auto mb-2" />
              <div className="font-semibold text-orange-700 dark:text-orange-100">
                Profile Settings
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                Update your info
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
