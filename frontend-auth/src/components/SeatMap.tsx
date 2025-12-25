import React, { useState, useEffect } from 'react';
import type { Seat, SeatStatus } from '../types/booking';

interface SeatMapProps {
  tripId: string;
  seats: Seat[];
  bookedSeats?: string[]; // Array of seat IDs that are already booked
  reservedSeats?: string[]; // Array of seat IDs that are reserved
  selectedSeats: string[]; // Array of selected seat IDs
  onSeatSelect: (seatId: string) => void;
  maxSeats?: number;
  basePrice: number;
}

const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  bookedSeats = [],
  reservedSeats = [],
  selectedSeats,
  onSeatSelect,
  maxSeats = 10,
  basePrice,
}) => {
  const [seatStatuses, setSeatStatuses] = useState<Map<string, SeatStatus>>(
    new Map()
  );

  useEffect(() => {
    const statusMap = new Map<string, SeatStatus>();
    seats.forEach(seat => {
      let status: SeatStatus['status'] = 'available';
      
      // Check if seat has status from backend (seats/status endpoint)
      const backendStatus = (seat as any).status;
      if (backendStatus) {
        if (backendStatus === 'booked') {
          status = 'booked';
        } else if (backendStatus === 'reserved') {
          status = 'reserved';
        } else if (backendStatus === 'unavailable') {
          status = 'available'; // Keep as available but not bookable
        } else if (selectedSeats.includes(seat.id)) {
          status = 'selected';
        } else {
          status = 'available';
        }
      } else {
        // Fallback to props-based status (old behavior)
        if (bookedSeats.includes(seat.id)) {
          status = 'booked';
        } else if (reservedSeats.includes(seat.id)) {
          status = 'reserved';
        } else if (selectedSeats.includes(seat.id)) {
          status = 'selected';
        }
      }

      statusMap.set(seat.id, { seat_id: seat.id, status });
    });
    setSeatStatuses(statusMap);
  }, [seats, bookedSeats, reservedSeats, selectedSeats]);

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<number, Seat[]>);

  // Sort rows
  const sortedRows = Object.keys(seatsByRow)
    .map(Number)
    .sort((a, b) => a - b);

  const getSeatColor = (seat: Seat, status: SeatStatus['status']) => {
    if (!seat.is_bookable || seat.seat_type === 'aisle') {
      return 'bg-gray-100 cursor-not-allowed';
    }
    
    switch (status) {
      case 'selected':
        return 'bg-green-500 text-white cursor-pointer hover:bg-green-600';
      case 'booked':
        return 'bg-red-400 text-white cursor-not-allowed';
      case 'reserved':
        return 'bg-orange-400 text-white cursor-not-allowed';
      case 'available':
        switch (seat.seat_type) {
          case 'vip':
            return 'bg-amber-400 hover:bg-amber-500 cursor-pointer';
          case 'sleeper':
            return 'bg-purple-400 hover:bg-purple-500 cursor-pointer';
          case 'standard':
          default:
            return 'bg-blue-400 hover:bg-blue-500 cursor-pointer';
        }
      default:
        return 'bg-gray-300';
    }
  };

  const handleSeatClick = (seat: Seat) => {
    const status = seatStatuses.get(seat.id);
    if (!status || !seat.is_bookable || seat.seat_type === 'aisle') {
      return;
    }

    if (status.status === 'booked' || status.status === 'reserved') {
      return;
    }

    if (status.status === 'available' && selectedSeats.length >= maxSeats) {
      alert(`You can select a maximum of ${maxSeats} seats`);
      return;
    }

    onSeatSelect(seat.id);
  };

  const getSeatIcon = (seat: Seat) => {
    if (seat.seat_type === 'aisle') {
      return null;
    }
    if (seat.seat_type === 'sleeper') {
      return '🛏️';
    }
    return '💺';
  };

  return (
    <div className="space-y-6">
      {/* Bus Front Indicator */}
      <div className="flex justify-center">
        <div className="bg-gray-800 text-white px-8 py-2 rounded-t-full">
          🚌 Driver
        </div>
      </div>

      {/* Seat Map */}
      <div className="border-4 border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="space-y-2">
          {sortedRows.map(rowNum => {
            const rowSeats = seatsByRow[rowNum].sort(
              (a, b) => a.column - b.column
            );

            return (
              <div key={rowNum} className="flex justify-center gap-2">
                <div className="w-8 text-center text-sm font-semibold text-gray-600">
                  {rowNum}
                </div>
                {rowSeats.map(seat => {
                  const status = seatStatuses.get(seat.id);
                  const seatColor = getSeatColor(
                    seat,
                    status?.status || 'available'
                  );

                  if (seat.seat_type === 'aisle') {
                    return (
                      <div key={seat.id} className="w-12 h-12" />
                    );
                  }

                  return (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-all ${seatColor}`}
                      disabled={
                        !seat.is_bookable ||
                        status?.status === 'booked' ||
                        status?.status === 'reserved'
                      }
                      title={`${seat.seat_number} - ${seat.seat_type.toUpperCase()} - $${(
                        basePrice * seat.price_multiplier
                      ).toFixed(2)}`}
                    >
                      <span className="text-lg">{getSeatIcon(seat)}</span>
                      <span className="text-[10px]">{seat.seat_number}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-400 rounded"></div>
          <span className="text-sm">Standard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded"></div>
          <span className="text-sm">VIP</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-400 rounded"></div>
          <span className="text-sm">Sleeper</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded"></div>
          <span className="text-sm">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-400 rounded"></div>
          <span className="text-sm">Booked</span>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedSeats.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Selected Seats:</h3>
          <div className="flex flex-wrap gap-2">
            {selectedSeats.map(seatId => {
              const seat = seats.find(s => s.id === seatId);
              if (!seat) return null;
              return (
                <span
                  key={seatId}
                  className="bg-white px-3 py-1 rounded-full text-sm font-medium"
                >
                  {seat.seat_number} - $
                  {(basePrice * seat.price_multiplier).toFixed(2)}
                </span>
              );
            })}
          </div>
          <div className="mt-3 text-right">
            <span className="text-lg font-bold">
              Total: $
              {selectedSeats
                .reduce((total, seatId) => {
                  const seat = seats.find(s => s.id === seatId);
                  return total + (seat ? basePrice * seat.price_multiplier : 0);
                }, 0)
                .toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatMap;
