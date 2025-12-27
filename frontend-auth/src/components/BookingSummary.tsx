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
      <h2 className="text-2xl font-bold dark:text-white">Booking Summary</h2>

      {/* Trip Details */}
      <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700 shadow-sm">
        <h3 className="font-semibold mb-3 text-lg dark:text-white">Trip Details</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Route:</span>
            <span className="font-medium dark:text-white">
              {tripDetails.origin} → {tripDetails.destination}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Departure:</span>
            <span className="font-medium dark:text-white">
              {formatDate(tripDetails.departure_time)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Arrival:</span>
            <span className="font-medium dark:text-white">
              {formatDate(tripDetails.arrival_time)}
            </span>
          </div>
          {tripDetails.bus_name && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Bus:</span>
              <span className="font-medium dark:text-white">{tripDetails.bus_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Passenger Details */}
      <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700 shadow-sm">
        <h3 className="font-semibold mb-3 text-lg dark:text-white">Passengers</h3>
        <div className="space-y-3">
          {passengers.map((passenger, index) => {
            const seat = seats.find(s => s.id === passenger.seat_id);
            const seatPrice = seat
              ? tripDetails.price * seat.price_multiplier
              : 0;

            return (
              <div key={index} className="border-b dark:border-gray-600 pb-3 last:border-b-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium dark:text-white">{passenger.full_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Seat {seat?.seat_number} ({seat?.seat_type.toUpperCase()})
                    </p>
                    {passenger.age && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">Age: {passenger.age}</p>
                    )}
                  </div>
                  <p className="font-semibold dark:text-white">${seatPrice.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Information */}
      <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700 shadow-sm">
        <h3 className="font-semibold mb-3 text-lg dark:text-white">Contact Information</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={contactInfo.name}
              onChange={e =>
                setContactInfo({ ...contactInfo, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={contactInfo.email}
              onChange={e =>
                setContactInfo({ ...contactInfo, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={contactInfo.phone}
              onChange={e =>
                setContactInfo({ ...contactInfo, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder="+1 234 567 8900"
            />
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="border dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/30 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold dark:text-white">Total Amount:</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${calculateTotal().toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {passengers.length} seat{passengers.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white disabled:opacity-50"
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

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        You will have 30 minutes to complete the payment after confirmation.
      </p>
    </form>
  );
};

export default BookingSummary;
