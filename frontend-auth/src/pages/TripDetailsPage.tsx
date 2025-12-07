import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bus, Wifi, Snowflake, UsbIcon, Coffee, Bed, ArrowLeft } from 'lucide-react';
import { BusTrip } from '../lib/mockData';
import SeatMap from '../components/SeatMap';
import PassengerForm from '../components/PassengerForm';
import BookingSummary from '../components/BookingSummary';
import { bookingAPI, tripAPI } from '../lib/api';
import type { Seat, Passenger } from '../types/booking';

type BookingStep = 'details' | 'seats' | 'passengers' | 'summary' | 'confirmation';

export default function TripDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('details');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [trip] = useState<BusTrip | null>(location.state?.trip || null);
  const [tripLoading] = useState(!location.state?.trip);

  useEffect(() => {
    // If trip not passed via location state, we would need to fetch it
    // For now, redirect back if no trip data
    if (!trip && !tripLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [trip, tripLoading, navigate]);

  useEffect(() => {
    if (trip && currentStep === 'seats' && seats.length === 0) {
      loadSeats();
    }
  }, [currentStep, trip]);

  const loadSeats = async () => {
    if (!trip?.id) return;
    
    setLoading(true);
    try {
      const response = await tripAPI.getAvailableSeats(trip.id);
      setSeats(response.data.data);
    } catch (error) {
      console.error('Failed to load seats:', error);
      alert('Failed to load seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatSelect = async (seatId: string) => {
    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
    } else {
      const newSelection = [...selectedSeatIds, seatId];
      setSelectedSeatIds(newSelection);
      
      try {
        // Reserve seats on backend (commented out for mock)
        // await bookingAPI.reserveSeats(id!, newSelection, sessionId);
      } catch (error) {
        console.error('Failed to reserve seats:', error);
        setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
        alert('Failed to reserve seat. It may be taken by another user.');
      }
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

      const response = await bookingAPI.createBooking({
        trip_id: trip.id,
        contact_email: contactInfo.email,
        contact_phone: contactInfo.phone,
        contact_name: contactInfo.name,
        passengers: passengers,
        session_id: sessionId,
      });
      
      const bookingData = response.data.data;
      setBookingId(bookingData.booking.id);
      setBookingReference(bookingData.booking.booking_reference);
      setCurrentStep('confirmation');
      
      alert('Booking created! Reference: ' + bookingData.booking.booking_reference);
    } catch (error: any) {
      console.error('Booking failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      alert('Booking failed: ' + errorMessage);
    }
  };

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <h2 className="text-xl font-bold mb-2">Trip not found</h2>
          <p className="text-gray-600 mb-4">The trip you're looking for doesn't exist or may have been removed.</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded">Go back</button>
        </div>
      </div>
    );
  }

  const amenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi className="h-5 w-5" />;
      case 'ac': return <Snowflake className="h-5 w-5" />;
      case 'usb charging': return <UsbIcon className="h-5 w-5" />;
      case 'snacks': return <Coffee className="h-5 w-5" />;
      case 'sleeper beds': return <Bed className="h-5 w-5" />;
      default: return <span className="h-5 w-5">•</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container-custom max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => currentStep === 'details' ? navigate('/dashboard') : setCurrentStep('details')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {currentStep === 'details' ? 'Back to Dashboard' : 'Back'}
        </button>

        {/* Progress Steps */}
        {currentStep !== 'details' && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {['seats', 'passengers', 'summary', 'confirmation'].map((step, index) => (
                <React.Fragment key={step}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      currentStep === step ? 'bg-blue-600 text-white' :
                      ['seats', 'passengers', 'summary', 'confirmation'].indexOf(currentStep) > index ?
                      'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="ml-2 text-sm font-medium capitalize hidden sm:inline">
                      {step}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      ['seats', 'passengers', 'summary', 'confirmation'].indexOf(currentStep) > index ?
                      'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Trip Details View */}
        {currentStep === 'details' && (
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Bus className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold">{trip.from} → {trip.to}</h1>
              </div>
              <div className="text-sm text-gray-500 mb-4">{trip.company} • {trip.busType} • {trip.duration}</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Departure</div>
                  <div className="font-semibold">{trip.departure}</div>
                  <div className="text-xs text-gray-400">{trip.from}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Arrival</div>
                  <div className="font-semibold">{trip.arrival}</div>
                  <div className="text-xs text-gray-400">{trip.to}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded text-right">
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="text-2xl font-bold text-blue-600">${trip.price}</div>
                  <div className="text-xs text-gray-400">{trip.availableSeats}/{trip.totalSeats} seats</div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Route & Stops</h3>
                <div className="text-sm text-gray-600">Pickup and dropoff points will be shown here. (Mock data)</div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-3">
                  {trip.amenities.map((amenity: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded text-sm">
                      {amenityIcon(amenity)}
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Policies</h3>
                <ul className="text-sm text-gray-600 list-disc pl-5">
                  <li>Free cancellation up to 24 hours before departure.</li>
                  <li>Bring valid ID for verification at boarding.</li>
                  <li>Luggage policy: 1 small bag and 1 checked luggage.</li>
                </ul>
              </div>
            </div>

            <div className="w-56">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="text-xs text-gray-500">Trip Summary</div>
                <div className="text-lg font-bold text-blue-600 mt-2">${trip.price}</div>
                <div className="text-sm text-gray-600 mt-1">{trip.departure} • {trip.duration}</div>
                <div className="mt-3">
                  <button 
                    onClick={handleBookNowClick} 
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Book Now
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-2">Driver</div>
                <div className="font-medium">Nguyen Van A</div>
                <div className="text-xs text-gray-400">License: 30A-12345</div>
                <div className="mt-3 text-sm text-gray-500">Vehicle: {trip.company} • Plate: 29B-123.45</div>
              </div>
            </div>
          </div>
        )}

        {/* Seat Selection Step */}
        {currentStep === 'seats' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-6">Select Your Seats</h2>
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

        {/* Passenger Form Step */}
        {currentStep === 'passengers' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <PassengerForm
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onSubmit={handlePassengersSubmit}
              onCancel={() => setCurrentStep('seats')}
            />
          </div>
        )}

        {/* Booking Summary Step */}
        {currentStep === 'summary' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
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

        {/* Confirmation Step */}
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
                <p className="text-sm text-gray-600">
                  Your e-tickets have been sent to your email address.
                </p>
              </div>

              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={() => bookingId && bookingAPI.downloadBookingTickets(bookingId)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  disabled={!bookingId}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Tickets
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
