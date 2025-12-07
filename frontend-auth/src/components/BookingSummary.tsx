import React, { useState } from 'react';
import type { Passenger } from '../types/booking';
import type { Seat } from '../types/booking';

interface BookingSummaryProps {
  tripDetails: {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    arrival_time: string;
    price: number;
    bus_name?: string;
  };
  seats: Seat[];
  passengers: Passenger[];
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  onConfirm: (contactInfo: { name: string; email: string; phone: string }) => Promise<void>;
  onBack: () => void;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  tripDetails,
  seats,
  passengers,
  contactInfo: initialContactInfo,
  onConfirm,
  onBack,
}) => {
  const [contactInfo, setContactInfo] = useState(initialContactInfo);
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateTotal = () => {
    return passengers.reduce((total, passenger) => {
      const seat = seats.find(s => s.id === passenger.seat_id);
      return total + (seat ? tripDetails.price * seat.price_multiplier : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactInfo.name || !contactInfo.email || !contactInfo.phone) {
      alert('Please fill in all contact information');
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(contactInfo);
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Booking failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold">Booking Summary</h2>

      {/* Trip Details */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h3 className="font-semibold mb-3 text-lg">Trip Details</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Route:</span>
            <span className="font-medium">
              {tripDetails.origin} → {tripDetails.destination}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Departure:</span>
            <span className="font-medium">
              {formatDate(tripDetails.departure_time)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Arrival:</span>
            <span className="font-medium">
              {formatDate(tripDetails.arrival_time)}
            </span>
          </div>
          {tripDetails.bus_name && (
            <div className="flex justify-between">
              <span className="text-gray-600">Bus:</span>
              <span className="font-medium">{tripDetails.bus_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Passenger Details */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h3 className="font-semibold mb-3 text-lg">Passengers</h3>
        <div className="space-y-3">
          {passengers.map((passenger, index) => {
            const seat = seats.find(s => s.id === passenger.seat_id);
            const seatPrice = seat
              ? tripDetails.price * seat.price_multiplier
              : 0;

            return (
              <div key={index} className="border-b pb-3 last:border-b-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{passenger.full_name}</p>
                    <p className="text-sm text-gray-600">
                      Seat {seat?.seat_number} ({seat?.seat_type.toUpperCase()})
                    </p>
                    {passenger.age && (
                      <p className="text-sm text-gray-600">Age: {passenger.age}</p>
                    )}
                  </div>
                  <p className="font-semibold">${seatPrice.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Information */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h3 className="font-semibold mb-3 text-lg">Contact Information</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={contactInfo.name}
              onChange={e =>
                setContactInfo({ ...contactInfo, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={contactInfo.email}
              onChange={e =>
                setContactInfo({ ...contactInfo, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={contactInfo.phone}
              onChange={e =>
                setContactInfo({ ...contactInfo, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 234 567 8900"
            />
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="border rounded-lg p-4 bg-blue-50 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold text-blue-600">
            ${calculateTotal().toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {passengers.length} seat{passengers.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isProcessing}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Confirm Booking'}
        </button>
      </div>

      <p className="text-sm text-gray-500 text-center">
        You will have 30 minutes to complete the payment after confirmation.
      </p>
    </form>
  );
};

export default BookingSummary;
