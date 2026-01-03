import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import WifiIcon from '@mui/icons-material/Wifi';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import UsbIcon from '@mui/icons-material/Usb';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import HotelIcon from '@mui/icons-material/Hotel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { BusTrip } from '../lib/mockData';
import SeatMap from '../components/SeatMap';
import PassengerForm from '../components/PassengerForm';
import BookingSummary from '../components/BookingSummary';
import TripReviews from '../components/TripReviews';
import RelatedTrips from '../components/RelatedTrips';
import { bookingAPI, tripAPI } from '../lib/api';
import { tokenManager } from '../lib/tokenManager';
import type { Seat, Passenger } from '../types/booking';
import { usePolling } from '../hooks/usePolling';
import { formatCurrency } from '../lib/utils';

type BookingStep = 'details' | 'seats' | 'passengers' | 'summary' | 'confirmation';

export default function TripDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: tripId } = useParams<{ id: string }>();

  const [currentStep, setCurrentStep] = useState<BookingStep>('details');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  const [bookingReference, _setBookingReference] = useState<string | null>(null);
  const [bookingId, _setBookingId] = useState<string | null>(null);
  const [trip, setTrip] = useState<BusTrip | null>(location.state?.trip || null);
  const [tripLoading, setTripLoading] = useState(!location.state?.trip);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tripError, setTripError] = useState<string | null>(null);

  // Fetch trip data if not available in location state
  useEffect(() => {
    const fetchTrip = async () => {
      if (!tripId) {
        setTripError('No trip ID provided');
        setTripLoading(false);
        return;
      }

      if (trip) {
        // Trip already loaded from location state
        setTripLoading(false);
        return;
      }

      try {
        setTripLoading(true);
        setTripError(null);
        const response = await tripAPI.getById(tripId);
        const apiTrip = response.data.data;
        
        // Transform API response to match BusTrip interface
        const normalizedTrip: BusTrip = {
          id: apiTrip.id,
          from: apiTrip.route?.origin || '',
          to: apiTrip.route?.destination || '',
          departure: new Date(apiTrip.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          arrival: new Date(apiTrip.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          duration: `${Math.floor((apiTrip.route?.duration_minutes || 0) / 60)}h ${(apiTrip.route?.duration_minutes || 0) % 60}m`,
          price: apiTrip.price, // Use price as-is from API
          busType: apiTrip.bus?.bus_type || 'Standard',
          company: 'Bus Booking System',
          availableSeats: apiTrip.available_seats || 0,
          totalSeats: apiTrip.bus?.total_seats || 0,
          amenities: ['WiFi', 'AC', 'Comfortable Seats'], // Default amenities
          rating: 4.5, // Default rating
        };
        
        setTrip(normalizedTrip);
      } catch (error: any) {
        console.error('Failed to fetch trip:', error);
        setTripError(error.response?.data?.error || 'Failed to load trip details');
      } finally {
        setTripLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, trip]);

  useEffect(() => {
    if (trip && currentStep === 'seats' && seats.length === 0) {
      loadSeats();
    }
  }, [currentStep, trip]);

  const loadSeats = async () => {
    if (!trip?.id) return;

    setLoading(true);
    try {
      // Use tripAPI to fetch seat data for the trip
      const response = await tripAPI.getSeatsWithStatus(trip.id);
      setSeats(response.data.data);
    } catch (error) {
      console.error('Failed to load seats:', error);
      alert('Failed to load seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh seats silently (for polling)
  const refreshSeats = async () => {
    if (!trip?.id || currentStep !== 'seats') return;

    try {
      setIsRefreshing(true);
      // Use tripAPI to fetch seat data for the trip
      const response = await tripAPI.getSeatsWithStatus(trip.id);
      const newSeats = response.data.data;

      setSeats(newSeats);

      const availableSeatIds = new Set(newSeats.map((s: Seat) => s.id));
      setSelectedSeatIds(prev => prev.filter(id => availableSeatIds.has(id)));
    } catch (error) {
      console.error('Failed to refresh seats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  usePolling({
    interval: 5000,
    enabled: currentStep === 'seats' && !!trip?.id,
    onPoll: refreshSeats,
  });

  const handleSeatSelect = async (seatId: string) => {
    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
    } else {
      const newSelection = [...selectedSeatIds, seatId];
      setSelectedSeatIds(newSelection);
    }
  };

  const handleBookNowClick = () => {
    setCurrentStep('seats');
  };

  const handleContinueToPassengers = () => {
    if (selectedSeatIds.length === 0) {
      alert('Please select at least one seat');
      return;
    }
    setCurrentStep('passengers');
  };

  const handlePassengersSubmit = (passengerData: Passenger[]) => {
    setPassengers(passengerData);
    setCurrentStep('summary');
  };

  const handleBookingConfirm = async (contactInfo: { name: string; email: string; phone: string }) => {
    try {
      if (!trip || !trip.id) {
        alert('Invalid trip ID');
        return;
      }

      // Get user info from token to link booking to authenticated user
      const userInfo = tokenManager.getUserInfo();
      
      const response = await bookingAPI.createBooking({
        trip_id: trip.id,
        user_id: userInfo?.userId || null,  // Link to user if authenticated
        contact_email: contactInfo.email,
        contact_phone: contactInfo.phone,
        contact_name: contactInfo.name,
        passengers: passengers,
        session_id: sessionId,
      });

      const bookingData = response.data.data;
      const createdBookingId = bookingData.booking.id;
      const reference = bookingData.booking.booking_reference;
      
      // Store booking reference in localStorage for payment page
      localStorage.setItem('lastBookingRef', reference);
      
      // Redirect to payment page instead of showing confirmation
      navigate(`/payment/${createdBookingId}?ref=${reference}`);
      
    } catch (error: any) {
      console.error('Booking failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      alert('Booking failed: ' + errorMessage);
    }
  };

  if (tripLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (tripError || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <h2 className="text-xl font-bold mb-2">Trip not found</h2>
          <p className="text-gray-600 mb-4">
            {tripError || "The trip you're looking for doesn't exist or may have been removed."}
          </p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded">Go back</button>
        </div>
      </div>
    );
  }

  const amenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <WifiIcon sx={{ fontSize: 20 }} />;
      case 'ac': return <AcUnitIcon sx={{ fontSize: 20 }} />;
      case 'usb charging': return <UsbIcon sx={{ fontSize: 20 }} />;
      case 'snacks': return <LocalCafeIcon sx={{ fontSize: 20 }} />;
      case 'sleeper beds': return <HotelIcon sx={{ fontSize: 20 }} />;
      default: return <span className="h-5 w-5">•</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="container-custom max-w-6xl mx-auto">
        <button
          onClick={() => currentStep === 'details' ? navigate('/dashboard') : setCurrentStep('details')}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mb-4"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} />
          {currentStep === 'details' ? 'Back to Dashboard' : 'Back'}
        </button>

        {currentStep !== 'details' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {['seats', 'passengers', 'summary', 'confirmation'].map((step, index) => (
                <React.Fragment key={step}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep === step ? 'bg-blue-600 text-white' :
                      ['seats', 'passengers', 'summary', 'confirmation'].indexOf(currentStep) > index ?
                        'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                      {index + 1}
                    </div>
                    <span className="ml-2 text-sm font-medium capitalize hidden sm:inline">
                      {step}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${['seats', 'passengers', 'summary', 'confirmation'].indexOf(currentStep) > index ?
                      'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'details' && (
          <>
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <DirectionsBusIcon sx={{ fontSize: 24 }} className="text-blue-600 dark:text-blue-400" />
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{trip.from} → {trip.to}</h1>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-300 mb-4">{trip.company} • {trip.busType} • {trip.duration}</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-300">Departure</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{trip.departure}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-400">{trip.from}</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-300">Arrival</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{trip.arrival}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-400">{trip.to}</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-300">Price</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(trip.price)}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-400">{trip.availableSeats}/{trip.totalSeats} seats</div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Route & Stops</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Pickup and dropoff points will be shown here. (Mock data)</div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Amenities</h3>
                  <div className="flex flex-wrap gap-3">
                    {trip.amenities.map((amenity: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded text-sm text-gray-900 dark:text-gray-100">
                        {amenityIcon(amenity)}
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Policies</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
                    <li>Free cancellation up to 24 hours before departure.</li>
                    <li>Bring valid ID for verification at boarding.</li>
                    <li>Luggage policy: 1 small bag and 1 checked luggage.</li>
                  </ul>
                </div>
              </div>

              <div className="w-56">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Trip Summary</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">{formatCurrency(trip.price)}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{trip.departure} • {trip.duration}</div>
                  <div className="mt-3">
                    <button
                      onClick={handleBookNowClick}
                      className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-semibold"
                    >
                      Book Now
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-300 mb-2">Driver</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Nguyen Van A</div>
                  <div className="text-xs text-gray-400 dark:text-gray-400">License: 30A-12345</div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-300">Vehicle: {trip.company} • Plate: 29B-123.45</div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-6">
              <TripReviews tripId={trip.id} />
            </div>

            {/* Related Trips Section */}
            <div className="mt-6">
              <RelatedTrips tripId={trip.id} />
            </div>
          </>
        )}

        {currentStep === 'seats' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Select Your Seats</h2>
              {isRefreshing && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                  <span>Updating availability...</span>
                </div>
              )}
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading seats...</p>
              </div>
            ) : (
              <>
                <SeatMap
                  tripId={trip.id}
                  seats={seats}
                  selectedSeats={selectedSeatIds}
                  onSeatSelect={handleSeatSelect}
                  maxSeats={10}
                  basePrice={trip.price}
                />
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleContinueToPassengers}
                    disabled={selectedSeatIds.length === 0}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Continue to Passenger Details
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {currentStep === 'passengers' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <PassengerForm
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onSubmit={handlePassengersSubmit}
              onCancel={() => setCurrentStep('seats')}
            />
          </div>
        )}

        {currentStep === 'summary' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <BookingSummary
              tripDetails={{
                id: trip.id,
                origin: trip.from,
                destination: trip.to,
                departure_time: new Date().toISOString(),
                arrival_time: new Date().toISOString(),
                price: trip.price,
                bus_name: trip.company,
              }}
              seats={seats}
              passengers={passengers}
              contactInfo={{ name: '', email: '', phone: '' }}
              onConfirm={handleBookingConfirm}
              onBack={() => setCurrentStep('passengers')}
            />
          </div>
        )}

        {currentStep === 'confirmation' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                <p className="text-gray-600">Your booking has been successfully created</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto mb-6">
                <p className="text-sm text-gray-600 mb-2">Booking Reference</p>
                <p className="text-3xl font-bold text-blue-600 mb-4">{bookingReference}</p>
                <p className="text-sm text-gray-600 mb-4">
                  Please save this reference number. You can use it to view your booking details.
                </p>
                <p className="text-sm text-orange-600 font-semibold mb-2">
                  ⚠️ Payment Required
                </p>
                <p className="text-sm text-gray-600">
                  Your booking will be confirmed after payment is completed.
                </p>
              </div>

              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={() => navigate(`/payment/${bookingId}?ref=${bookingReference}`)}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold text-lg shadow-lg"
                  disabled={!bookingId}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Proceed to Payment
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Pay Later
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
