import React, { useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import { tripAPI } from '../lib/api';

interface Seat {
  id: string;
  seat_number: string;
  row: number;
  column: number;
  seat_type: string;
  position: string;
  price_multiplier: number;
  is_bookable: boolean;
  status: 'available' | 'booked' | 'reserved' | 'unavailable';
  booking_reference?: string;
  passenger_name?: string;
}

interface TripSeatViewerProps {
  tripId: string;
  tripInfo: {
    from: string;
    to: string;
    departure: string;
    date: string;
    busType: string;
  };
  onClose: () => void;
}

export const TripSeatViewer: React.FC<TripSeatViewerProps> = ({ tripId, tripInfo, onClose }) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSeats();
  }, [tripId]);

  const fetchSeats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tripAPI.getSeatsWithStatus(tripId);
      setSeats(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch seats:', err);
      setError(err.response?.data?.error || 'Failed to load seat data');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeatStats = () => {
    const total = seats.filter(s => s.is_bookable).length;
    const booked = seats.filter(s => s.status === 'booked').length;
    const reserved = seats.filter(s => s.status === 'reserved').length;
    const available = seats.filter(s => s.status === 'available' && s.is_bookable).length;

    return { total, booked, reserved, available };
  };

  const stats = getSeatStats();

  const getSeatColor = (seat: Seat) => {
    if (!seat.is_bookable || seat.seat_type === 'aisle') {
      return 'bg-gray-200 cursor-not-allowed';
    }
    switch (seat.status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 border-green-300';
      case 'booked':
        return 'bg-red-100 border-red-300';
      case 'reserved':
        return 'bg-yellow-100 border-yellow-300';
      case 'unavailable':
        return 'bg-gray-300 border-gray-400';
      default:
        return 'bg-gray-100';
    }
  };

  const getSeatIcon = (seat: Seat) => {
    if (!seat.is_bookable || seat.seat_type === 'aisle') {
      return null;
    }
    switch (seat.status) {
      case 'available':
        return <CheckCircleIcon sx={{ fontSize: 12 }} className="text-green-600" />;
      case 'booked':
        return <CancelIcon sx={{ fontSize: 12 }} className="text-red-600" />;
      case 'reserved':
        return <AccessTimeIcon sx={{ fontSize: 12 }} className="text-yellow-600" />;
      case 'unavailable':
        return <ErrorIcon sx={{ fontSize: 12 }} className="text-gray-600" />;
      default:
        return null;
    }
  };

  // Group seats by row
  const seatsByRow: { [key: number]: Seat[] } = {};
  seats.forEach(seat => {
    if (!seatsByRow[seat.row]) {
      seatsByRow[seat.row] = [];
    }
    seatsByRow[seat.row].push(seat);
  });

  // Sort seats in each row by column
  Object.keys(seatsByRow).forEach(row => {
    seatsByRow[parseInt(row)].sort((a, b) => a.column - b.column);
  });

  const rows = Object.keys(seatsByRow).map(Number).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Trip Seat Details</h2>
              <div className="text-sm opacity-90">
                <div>{tripInfo.from} → {tripInfo.to}</div>
                <div>{tripInfo.date} | {tripInfo.departure} | {tripInfo.busType}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <CloseIcon sx={{ fontSize: 24 }} />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="text-xs opacity-90">Total Seats</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-green-500 bg-opacity-30 rounded-lg p-3">
              <div className="text-xs opacity-90">Available</div>
              <div className="text-2xl font-bold">{stats.available}</div>
            </div>
            <div className="bg-red-500 bg-opacity-30 rounded-lg p-3">
              <div className="text-xs opacity-90">Booked</div>
              <div className="text-2xl font-bold">{stats.booked}</div>
            </div>
            <div className="bg-yellow-500 bg-opacity-30 rounded-lg p-3">
              <div className="text-xs opacity-90">Reserved</div>
              <div className="text-2xl font-bold">{stats.reserved}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading seat map...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <ErrorIcon sx={{ fontSize: 48 }} className="text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchSeats}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 border border-green-300 rounded"></div>
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-100 border border-red-300 rounded"></div>
                  <span className="text-sm">Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-100 border border-yellow-300 rounded"></div>
                  <span className="text-sm">Reserved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <span className="text-sm">Aisle/Unavailable</span>
                </div>
              </div>

              {/* Seat Map */}
              <div className="flex flex-col items-center space-y-2">
                {/* Driver Section */}
                <div className="w-full max-w-md mb-4">
                  <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white py-2 px-4 rounded-t-lg text-center font-semibold">
                    🚗 Driver
                  </div>
                </div>

                {/* Seats */}
                {rows.map(rowNum => (
                  <div key={rowNum} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6">{rowNum}</span>
                    <div className="flex gap-2">
                      {seatsByRow[rowNum].map((seat, _idx) => {
                        const isAisle = seat.seat_type === 'aisle' || !seat.is_bookable;
                        
                        return (
                          <div
                            key={seat.id}
                            className={`
                              relative group
                              ${isAisle ? 'w-4' : 'w-12 h-12'}
                              ${isAisle ? '' : 'border-2 rounded-lg'}
                              ${getSeatColor(seat)}
                              flex items-center justify-center
                              transition-all duration-200
                              ${!isAisle && seat.status === 'available' ? 'hover:scale-105' : ''}
                            `}
                            title={isAisle ? '' : `${seat.seat_number} - ${seat.status}`}
                          >
                            {!isAisle && (
                              <>
                                <div className="flex flex-col items-center">
                                  <span className="text-xs font-bold">{seat.seat_number}</span>
                                  {getSeatIcon(seat)}
                                </div>
                                
                                {/* Tooltip */}
                                {seat.status !== 'available' && (
                                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                    {seat.status === 'booked' && seat.booking_reference && (
                                      <div>
                                        <div>Ref: {seat.booking_reference}</div>
                                        {seat.passenger_name && <div>{seat.passenger_name}</div>}
                                      </div>
                                    )}
                                    {seat.status === 'reserved' && (
                                      <div>Reserved (pending payment)</div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Exit */}
                <div className="w-full max-w-md mt-4">
                  <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 rounded-b-lg text-center font-semibold">
                    🚪 Exit
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <PeopleIcon sx={{ fontSize: 16, mr: 0.5 }} className="inline" />
            Occupancy: {stats.total > 0 ? ((stats.booked / stats.total) * 100).toFixed(1) : 0}%
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
