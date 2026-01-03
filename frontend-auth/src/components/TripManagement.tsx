import React, { useState, useEffect } from 'react';
import { adminAPI, tripAPI } from '../lib/api';
import {
  DirectionsBus,
  CheckCircle,
  Cancel,
  Person,
  Event,
  AccessTime,
  Search,
  QrCodeScanner,
  CheckBox,
  CheckBoxOutlineBlank,
} from '@mui/icons-material';

interface Trip {
  id: string;
  route: {
    origin: string;
    destination: string;
  };
  start_time: string;
  end_time: string;
  status: string;
  price: number;
  bus: {
    total_seats: number;
  };
}

interface Passenger {
  passenger_id: string;
  booking_id: string;
  full_name: string;
  seat_number: string;
  phone?: string;
  email?: string;
  checked_in: boolean;
  checked_in_at?: string;
  ticket_number: string;
}

export const TripManagement: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPassengers, setIsLoadingPassengers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'today' | 'upcoming' | 'past'>('today');
  const [selectedPassengers, setSelectedPassengers] = useState<Set<string>>(new Set());

  // Fetch trips
  const fetchTrips = async () => {
    setIsLoading(true);
    try {
      let searchDate = new Date();
      
      if (filterStatus === 'past') {
        searchDate.setDate(searchDate.getDate() - 1);
      } else if (filterStatus === 'upcoming') {
        searchDate.setDate(searchDate.getDate() + 1);
      }
      // 'today' uses current date

      const dateParam = searchDate.toISOString().split('T')[0];

      const response = await tripAPI.search({
        origin: '',
        destination: '',
        date: dateParam,
      });

      // Handle response structure - backend returns { data: [...], pagination: {...} }
      const tripsData = response.data?.data || response.data?.trips || [];
      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      setTrips([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch passengers for selected trip
  const fetchPassengers = async (tripId: string) => {
    setIsLoadingPassengers(true);
    try {
      const response = await adminAPI.getTripPassengers(tripId);
      // Backend returns { data: [...], count: 2, success: true }
      setPassengers(response.data.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch passengers:', error);
    } finally {
      setIsLoadingPassengers(false);
    }
  };

  // Check in a single passenger
  const checkInPassenger = async (passengerId: string) => {
    if (!selectedTrip) return;
    
    try {
      await adminAPI.checkInPassenger(selectedTrip.id, passengerId);
      // Refresh passenger list
      await fetchPassengers(selectedTrip.id);
      setSelectedPassengers(new Set());
    } catch (error) {
      console.error('Failed to check in passenger:', error);
      alert('Failed to check in passenger');
    }
  };

  // Bulk check-in
  const bulkCheckIn = async () => {
    if (!selectedTrip || selectedPassengers.size === 0) return;

    try {
      for (const passengerId of selectedPassengers) {
        await adminAPI.checkInPassenger(selectedTrip.id, passengerId);
      }
      // Refresh passenger list
      await fetchPassengers(selectedTrip.id);
      setSelectedPassengers(new Set());
    } catch (error) {
      console.error('Failed to bulk check in:', error);
      alert('Failed to check in passengers');
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [filterStatus]);

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    fetchPassengers(trip.id);
    setSelectedPassengers(new Set());
  };

  const handleBack = () => {
    setSelectedTrip(null);
    setPassengers([]);
    setSelectedPassengers(new Set());
  };

  const togglePassengerSelection = (passengerId: string) => {
    const newSelection = new Set(selectedPassengers);
    if (newSelection.has(passengerId)) {
      newSelection.delete(passengerId);
    } else {
      newSelection.add(passengerId);
    }
    setSelectedPassengers(newSelection);
  };

  const selectAllUnchecked = () => {
    const uncheckedPassengers = passengers
      .filter(p => !p.checked_in)
      .map(p => p.passenger_id);
    setSelectedPassengers(new Set(uncheckedPassengers));
  };

  const filteredTrips = trips.filter(trip => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trip.route.origin.toLowerCase().includes(query) ||
      trip.route.destination.toLowerCase().includes(query)
    );
  });

  const checkedInCount = passengers.filter(p => p.checked_in).length;
  const totalPassengers = passengers.length;

  if (selectedTrip) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={handleBack}
            className="mb-4 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            ← Back to Trips
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DirectionsBus className="text-red-600" />
                {selectedTrip.route.origin} → {selectedTrip.route.destination}
              </h2>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Event fontSize="small" />
                  {new Date(selectedTrip.start_time).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <AccessTime fontSize="small" />
                  {new Date(selectedTrip.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {checkedInCount}/{totalPassengers}
              </div>
              <div className="text-sm text-gray-500">Checked In</div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedPassengers.size > 0 && (
          <div className="p-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <strong>{selectedPassengers.size}</strong> passenger{selectedPassengers.size > 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPassengers(new Set())}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Selection
              </button>
              <button
                onClick={bulkCheckIn}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle fontSize="small" />
                Check In Selected
              </button>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={selectAllUnchecked}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={passengers.every(p => p.checked_in)}
          >
            Select All Unchecked
          </button>
          
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle fontSize="small" />
              <span>{checkedInCount} Checked In</span>
            </div>
            <div className="text-gray-400">•</div>
            <div className="flex items-center gap-1 text-orange-600">
              <Cancel fontSize="small" />
              <span>{totalPassengers - checkedInCount} Pending</span>
            </div>
          </div>
        </div>

        {/* Passenger List */}
        <div className="p-6">
          {isLoadingPassengers ? (
            <div className="text-center py-12 text-gray-500">Loading passengers...</div>
          ) : passengers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No passengers booked for this trip</div>
          ) : (
            <div className="space-y-2">
              {passengers.map((passenger) => (
                <div
                  key={passenger.passenger_id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    passenger.checked_in
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    {!passenger.checked_in && (
                      <button
                        onClick={() => togglePassengerSelection(passenger.passenger_id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedPassengers.has(passenger.passenger_id) ? (
                          <CheckBox className="text-blue-600" />
                        ) : (
                          <CheckBoxOutlineBlank />
                        )}
                      </button>
                    )}
                    
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      passenger.checked_in ? 'bg-green-600' : 'bg-gray-400'
                    }`}>
                      <Person className="text-white" />
                    </div>
                    
                    {/* Passenger Info */}
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {passenger.full_name}
                        {passenger.checked_in && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                            Checked In
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-3 mt-1">
                        <span className="font-medium">Seat {passenger.seat_number}</span>
                        {passenger.phone && <span>• {passenger.phone}</span>}
                        {passenger.ticket_number && (
                          <span className="text-xs text-gray-500">• Ticket: {passenger.ticket_number}</span>
                        )}
                      </div>
                      {passenger.checked_in && passenger.checked_in_at && (
                        <div className="text-xs text-green-600 mt-1">
                          Checked in at {new Date(passenger.checked_in_at).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Check-in Button */}
                  {!passenger.checked_in && (
                    <button
                      onClick={() => checkInPassenger(passenger.passenger_id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                    >
                      <QrCodeScanner fontSize="small" />
                      Check In
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          <DirectionsBus className="text-red-600" />
          Trip Management & Check-In
        </h2>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fontSize="small" />
            <input
              type="text"
              placeholder="Search by origin or destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="upcoming">Upcoming (7 days)</option>
            <option value="all">All Trips</option>
            <option value="past">Past (7 days)</option>
          </select>
        </div>
      </div>

      {/* Trip List */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading trips...</div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No trips found. Try adjusting your filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrips.map((trip) => {
              const departureTime = new Date(trip.start_time);
              const isPast = departureTime < new Date();

              return (
                <button
                  key={trip.id}
                  onClick={() => handleTripClick(trip)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    {/* Trip Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-bold text-lg text-gray-900">
                          {trip.route.origin} → {trip.route.destination}
                        </div>
                        {isPast && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                            Completed
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Event fontSize="small" />
                          {departureTime.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <AccessTime fontSize="small" />
                          {departureTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-green-600 font-semibold">
                          {(trip.price / 1000).toFixed(0)}K VND
                        </div>
                      </div>
                    </div>

                    {/* Bus Info */}
                    <div className="text-right ml-4">
                      <div className="text-lg font-semibold text-gray-700">
                        {trip.bus?.total_seats || 0} Seats
                      </div>
                      <div className="text-xs text-gray-500">Total Capacity</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
