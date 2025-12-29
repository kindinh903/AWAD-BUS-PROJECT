import React, { useState } from 'react';
import type { Passenger } from '../types/booking';
import type { Seat } from '../types/booking';

interface PassengerFormProps {
  seats: Seat[];
  selectedSeatIds: string[];
  onSubmit: (passengers: Passenger[]) => void;
  onCancel: () => void;
}

const PassengerForm: React.FC<PassengerFormProps> = ({
  seats,
  selectedSeatIds,
  onSubmit,
  onCancel,
}) => {
  const selectedSeats = seats.filter(s => selectedSeatIds.includes(s.id));
  
  const [passengers, setPassengers] = useState<Passenger[]>(
    selectedSeats.map(seat => ({
      seat_id: seat.id,
      full_name: '',
      id_number: undefined,
      phone: undefined,
      email: undefined,
      age: undefined,
      gender: undefined,
      special_needs: undefined,
    }))
  );

  const handleInputChange = (
    index: number,
    field: keyof Passenger,
    value: string | number | undefined
  ) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const isValid = passengers.every(p => p.full_name.trim() !== '');
    if (!isValid) {
      alert('Please fill in all passenger names');
      return;
    }

    onSubmit(passengers);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-2xl font-bold dark:text-white">Passenger Information</h2>

        {passengers.map((passenger, index) => {
          const seat = selectedSeats[index];
          
          return (
            <div key={seat.id} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700 shadow-sm">
              <h3 className="font-semibold mb-3 text-lg dark:text-white">
                Passenger {index + 1} - Seat {seat.seat_number}
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  ({seat.seat_type.toUpperCase()})
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={passenger.full_name}
                    onChange={e =>
                      handleInputChange(index, 'full_name', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID Number
                  </label>
                  <input
                    type="text"
                    value={passenger.id_number || ''}
                    onChange={e =>
                      handleInputChange(index, 'id_number', e.target.value || undefined)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Passport or ID number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={passenger.phone || ''}
                    onChange={e =>
                      handleInputChange(index, 'phone', e.target.value || undefined)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={passenger.email || ''}
                    onChange={e =>
                      handleInputChange(index, 'email', e.target.value || undefined)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={passenger.age || ''}
                    onChange={e =>
                      handleInputChange(
                        index,
                        'age',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={passenger.gender || ''}
                    onChange={e =>
                      handleInputChange(index, 'gender', e.target.value || undefined)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Special Needs
                  </label>
                  <textarea
                    value={passenger.special_needs || ''}
                    onChange={e =>
                      handleInputChange(
                        index,
                        'special_needs',
                        e.target.value || undefined
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Wheelchair access, dietary requirements, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Continue to Booking
          </button>
        </div>
      </form>
    </div>
  );
};

export default PassengerForm;
