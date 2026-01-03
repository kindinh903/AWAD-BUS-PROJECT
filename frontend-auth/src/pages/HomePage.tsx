import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import ShieldIcon from '@mui/icons-material/Shield';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PeopleIcon from '@mui/icons-material/People';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Container, Section } from '../components/ui/Container';
import { StaggerItem, StaggerGrid } from '../components/ui/Stagger';
import { CardSkeleton } from '../components/ui/Skeleton';
import { tripAPI } from '../lib/api';
import { formatCurrency } from '../lib/utils';

interface Trip {
  id: string;
  route?: {
    origin: string;
    destination: string;
  };
  bus?: {
    name: string;
    bus_type: string;
    amenities?: string[];
    seat_map?: {
      total_seats: number;
    };
  };
  start_time: string;
  end_time: string;
  price: number;
  available_seats: number;
  status: string;
}

interface PopularRoute {
  origin: string;
  destination: string;
  price: number;
  duration: string;
  image: string;
}

// Route images mapping for visual display
const routeImages: Record<string, string> = {
  'Ho Chi Minh City': '🏙️',
  'Da Nang': '🏖️',
  'Hanoi': '🏛️',
  'Hai Phong': '🌉',
  'Hue': '⛩️',
  'Vung Tau': '🏖️',
  'Ha Long': '⛵',
  'Can Tho': '🌾',
  'Nha Trang': '🌴',
  'Da Lat': '🌸',
  'default': '🚌'
};

// Bus types showcase
const busTypes = [
  { type: 'Standard', seats: 45, amenities: ['AC', 'Reclining Seats'], price: 'Budget-friendly', icon: '🚌' },
  { type: 'VIP', seats: 35, amenities: ['AC', 'WiFi', 'TV', 'Snacks'], price: 'Premium comfort', icon: '🚎' },
  { type: 'Sleeper', seats: 24, amenities: ['AC', 'Bed', 'Blanket', 'USB'], price: 'Overnight travel', icon: '🛏️' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<PopularRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  // Fetch available trips for today and extract popular routes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await tripAPI.search({ origin: '', destination: '', date: today });
        // API returns { data: [...trips], pagination: {...} }
        const trips: Trip[] = res.data?.data || [];

        // Set available trips for today (up to 6)
        setAvailableTrips(trips.slice(0, 6));

        // Extract unique routes from trips for popular routes section
        const routeMap = new Map<string, PopularRoute>();
        trips.forEach((trip) => {
          if (trip.route?.origin && trip.route?.destination) {
            const key = `${trip.route.origin}-${trip.route.destination}`;
            if (!routeMap.has(key)) {
              // Calculate approximate duration from start_time and end_time
              let duration = '3h';
              if (trip.start_time && trip.end_time) {
                const start = new Date(trip.start_time);
                const end = new Date(trip.end_time);
                const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                duration = diffHours >= 1 ? `${Math.round(diffHours)}h` : `${Math.round(diffHours * 60)}m`;
              }

              routeMap.set(key, {
                origin: trip.route.origin,
                destination: trip.route.destination,
                price: trip.price,
                duration,
                image: routeImages[trip.route.destination] || routeImages[trip.route.origin] || routeImages['default']
              });
            }
          }
        });

        setPopularRoutes(Array.from(routeMap.values()).slice(0, 6));
      } catch (error) {
        console.error('Failed to fetch trips:', error);
      } finally {
        setLoading(false);
        setLoadingRoutes(false);
      }
    };
    fetchData();
  }, []);

  const formatPrice = (price: number) => {
    return formatCurrency(price);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section with Bus Image */}
      <section className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white overflow-hidden min-h-[600px]">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Bus Image Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069)',
            backgroundBlendMode: 'overlay'
          }}
        ></div>

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Top Banner */}
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-yellow-300 text-gray-900 rounded-full px-6 py-3 mb-8 shadow-lg">
              <AutoAwesomeIcon sx={{ fontSize: 20 }} />
              <span className="text-sm md:text-base font-bold">24 YEARS OF TRUST & DEVELOPMENT</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight drop-shadow-2xl">
              Vietnam's Leading
              <span className="block text-yellow-300">Bus Service</span>
            </h1>

            <p className="text-xl md:text-2xl text-orange-50 mb-12 max-w-3xl mx-auto font-medium">
              Quality Service • Safe Journey • Trusted by Millions
            </p>

            {/* CTA Section */}
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
                Ready to start your journey?
              </h2>
              
              <button
                onClick={() => navigate('/routes')}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-5 px-16 rounded-2xl text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 inline-flex items-center gap-4 hover:scale-105 transform"
              >
                <DirectionsBusIcon sx={{ fontSize: 32 }} />
                BOOK YOUR TICKET NOW
                <ArrowForwardIcon sx={{ fontSize: 28 }} />
              </button>

              <p className="text-white/90 text-sm mt-4">
                Browse 500+ destinations across Vietnam
              </p>
            </div>

            {/* Trust Badges */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-colors">
                <div className="text-4xl mb-2">🚌</div>
                <div className="text-white font-semibold text-sm">Modern Fleet</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-colors">
                <div className="text-4xl mb-2">⭐</div>
                <div className="text-white font-semibold text-sm">Top Rated</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-colors">
                <div className="text-4xl mb-2">🔒</div>
                <div className="text-white font-semibold text-sm">Safe & Secure</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-colors">
                <div className="text-4xl mb-2">💳</div>
                <div className="text-white font-semibold text-sm">Easy Payment</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/90">
              <div className="flex items-center gap-2">
                <PeopleIcon sx={{ fontSize: 24 }} />
                <span className="font-semibold">2M+ Travelers</span>
              </div>
              <div className="flex items-center gap-2">
                <LocationOnIcon sx={{ fontSize: 24 }} />
                <span className="font-semibold">500+ Destinations</span>
              </div>
              <div className="flex items-center gap-2">
                <DirectionsBusIcon sx={{ fontSize: 24 }} />
                <span className="font-semibold">1000+ Daily Trips</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available Buses Today */}
      <Section background="default">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                🚌 Available Today
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Buses departing soon - no search needed!
              </p>
            </div>
            <Link
              to="/routes"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              View All <ChevronRightIcon sx={{ fontSize: 16 }} />
            </Link>
          </div>

          {loading ? (
            <StaggerGrid cols={3}>
              {[1, 2, 3].map((i) => (
                <StaggerItem key={i}>
                  <CardSkeleton />
                </StaggerItem>
              ))}
            </StaggerGrid>
          ) : availableTrips.length > 0 ? (
            <StaggerGrid cols={3}>
              {availableTrips.map((trip) => (
                <StaggerItem key={trip.id}>
                  <Card variant="default" hover className="h-full">
                    <CardContent className="p-6">
                      <Link
                        to={`/trips/${trip.id}`}
                        className="block group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors break-words">
                              <span>{trip.route?.origin || 'Origin'}</span>
                              <ArrowForwardIcon sx={{ fontSize: 16 }} className="text-blue-500" />
                              <span>{trip.route?.destination || 'Destination'}</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {trip.bus?.name || 'Bus'} • {trip.bus?.bus_type || 'Standard'}
                            </p>
                          </div>
                          <div className="text-right ml-4 md:ml-8">
                            <p className="text-lg font-bold text-blue-600">
                              {formatPrice(trip.price)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div className="flex items-center gap-1">
                            <AccessTimeIcon sx={{ fontSize: 16 }} />
                            <span>{formatTime(trip.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <PeopleIcon sx={{ fontSize: 16 }} />
                            <span>{trip.available_seats} seats</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                          <Badge
                            variant={trip.available_seats > 10 ? 'success' : 'warning'}
                            size="sm"
                          >
                            {trip.available_seats > 10 ? 'Available' : 'Filling Fast'}
                          </Badge>
                          <span className="text-sm text-blue-600 font-medium group-hover:underline flex items-center gap-1">
                            Book Now
                            <ArrowForwardIcon sx={{ fontSize: 14 }} />
                          </span>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerGrid>
          ) : (
            <Card className="text-center py-12 border border-gray-200 dark:border-slate-700">
              <CardContent>
                <DirectionsBusIcon sx={{ fontSize: 48 }} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No trips available today. Check back tomorrow!</p>
                <Link to="/routes">
                  <Button variant="outline">
                    Browse all routes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </Container>
      </Section>

      {/* Popular Routes */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              ⭐ Popular Routes
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Most booked destinations by our travelers
            </p>
          </div>

          {loadingRoutes ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-2xl h-24 animate-pulse"></div>
              ))}
            </div>
          ) : popularRoutes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularRoutes.map((route, index) => (
                <Link
                  key={index}
                  to={`/routes?origin=${encodeURIComponent(route.origin)}&amp;destination=${encodeURIComponent(route.destination)}`}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{route.image}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {route.origin} → {route.destination}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {route.duration} journey
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 dark:text-gray-400">from</div>
                      <div className="font-bold text-blue-600">{formatPrice(route.price)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
              <LocationOnIcon sx={{ fontSize: 48 }} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No popular routes available yet.</p>
              <Link to="/routes" className="mt-4 inline-block text-blue-600 hover:underline">
                Browse all routes →
              </Link>
            </div>
          )}

          <div className="text-center mt-8">
            <Link
              to="/routes"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              Explore All Routes <ArrowForwardIcon sx={{ fontSize: 16 }} />
            </Link>
          </div>
        </div>
      </section>

      {/* Fleet Showcase */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🚎 Our Fleet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose the perfect bus for your journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {busTypes.map((bus, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-5xl mb-4">{bus.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {bus.type}
                </h3>
                <p className="text-blue-600 font-medium mb-4">{bus.price}</p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <PeopleIcon sx={{ fontSize: 16 }} />
                    {bus.seats} seats
                  </li>
                  {bus.amenities.map((amenity, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <BoltIcon sx={{ fontSize: 16 }} className="text-yellow-500" />
                      {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/fleet"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              View Full Fleet Details <ChevronRightIcon sx={{ fontSize: 16 }} />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Why Choose BusBooking?</h2>
            <p className="text-blue-100">Trusted by millions of travelers across Vietnam</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldIcon sx={{ fontSize: 32 }} />
              </div>
              <h3 className="font-semibold mb-2">Safe Travel</h3>
              <p className="text-sm text-blue-100">All buses meet safety standards</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CreditCardIcon sx={{ fontSize: 32 }} />
              </div>
              <h3 className="font-semibold mb-2">Easy Payment</h3>
              <p className="text-sm text-blue-100">Multiple payment options</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HeadsetMicIcon sx={{ fontSize: 32 }} />
              </div>
              <h3 className="font-semibold mb-2">24/7 Support</h3>
              <p className="text-sm text-blue-100">Always here to help</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <EmojiEventsIcon sx={{ fontSize: 32 }} />
              </div>
              <h3 className="font-semibold mb-2">Best Prices</h3>
              <p className="text-sm text-blue-100">Price match guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* Promotions Banner */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 mb-4">
                  <LocalOfferIcon sx={{ fontSize: 16 }} />
                  <span className="text-sm font-medium">Limited Time Offer</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-2">
                  Get 20% Off Your First Booking!
                </h3>
                <p className="text-white/80">Use code SAVE20 at checkout</p>
              </div>
              <Link
                to="/promotions"
                className="px-8 py-3 bg-white text-orange-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
              >
                View All Deals
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
