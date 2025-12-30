import React, { useState } from 'react';
import {
  Filter,
  Clock,
  Coins,
  Bus,
  Wifi,
  Snowflake,
  UsbIcon,
  Coffee,
  Bed,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export interface TripFiltersState {
  priceRange: {
    min: number;
    max: number;
  };
  timeSlots: string[];
  busTypes: string[];
  amenities: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface TripFiltersProps {
  filters: TripFiltersState;
  onFiltersChange: (filters: TripFiltersState) => void;
  className?: string;
  minPrice?: number;
  maxPrice?: number;
}

// Time slot configurations
const TIME_SLOTS = [
  { id: 'early-morning', label: 'Early Morning', range: '05:00 - 08:00', hours: [5, 8] },
  { id: 'morning', label: 'Morning', range: '08:00 - 12:00', hours: [8, 12] },
  { id: 'afternoon', label: 'Afternoon', range: '12:00 - 17:00', hours: [12, 17] },
  { id: 'evening', label: 'Evening', range: '17:00 - 21:00', hours: [17, 21] },
  { id: 'night', label: 'Night', range: '21:00 - 05:00', hours: [21, 24] },
];

// Bus type configurations
const BUS_TYPES = [
  { id: 'standard', label: 'Standard', icon: Bus, description: 'Basic comfort' },
  { id: 'vip', label: 'VIP', icon: Bus, description: 'Premium comfort' },
  { id: 'sleeper', label: 'Sleeper', icon: Bed, description: 'Sleeping berths' },
];

// Amenity configurations
const AMENITIES = [
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'ac', label: 'Air Conditioning', icon: Snowflake },
  { id: 'usb-charging', label: 'USB Charging', icon: UsbIcon },
  { id: 'reclining-seats', label: 'Reclining Seats', icon: Bus },
  { id: 'sleeper-beds', label: 'Sleeper Beds', icon: Bed },
  { id: 'snacks', label: 'Snacks', icon: Coffee },
  { id: 'water', label: 'Water', icon: Coffee },
  { id: 'blanket', label: 'Blanket', icon: Bed },
  { id: 'pillow', label: 'Pillow', icon: Bed },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'price', label: 'Price' },
  { value: 'departure', label: 'Departure Time' },
  { value: 'arrival', label: 'Arrival Time' },
  { value: 'duration', label: 'Duration' },
  { value: 'rating', label: 'Rating' },
  { value: 'availability', label: 'Available Seats' },
];

// Price range presets
const PRICE_PRESETS = [
  { label: 'Budget', min: 0, max: 200000 },
  { label: 'Standard', min: 200000, max: 500000 },
  { label: 'Premium', min: 500000, max: 1000000 },
  { label: 'All', min: 0, max: 2000000 },
];

export const TripFilters: React.FC<TripFiltersProps> = ({
  filters,
  onFiltersChange,
  className = '',
  minPrice = 0,
  maxPrice = 100,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count active filters
  const activeFiltersCount = 
    filters.timeSlots.length +
    filters.busTypes.length +
    filters.amenities.length +
    (filters.priceRange.min > minPrice || filters.priceRange.max < maxPrice ? 1 : 0);

  // Handle price range updates
  const updatePriceRange = (min: number, max: number) => {
    onFiltersChange({
      ...filters,
      priceRange: { min, max },
    });
  };

  // Handle price slider drag
  const handlePriceSliderChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'min' | 'max') => {
    const value = parseInt(event.target.value);
    if (type === 'min') {
      updatePriceRange(Math.min(value, filters.priceRange.max - 1), filters.priceRange.max);
    } else {
      updatePriceRange(filters.priceRange.min, Math.max(value, filters.priceRange.min + 1));
    }
  };

  // Toggle filter arrays
  const toggleArrayFilter = (filterType: keyof TripFiltersState, value: string) => {
    const currentArray = filters[filterType] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    onFiltersChange({
      ...filters,
      [filterType]: newArray,
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      priceRange: { min: minPrice, max: maxPrice },
      timeSlots: [],
      busTypes: [],
      amenities: [],
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  };

  // Handle sort change
  const handleSortChange = (sortBy: string) => {
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder: newSortOrder,
    });
  };

  // Price range percentage for slider display
  const getSliderPercentage = (value: number) => {
    return ((value - minPrice) / (maxPrice - minPrice)) * 100;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Compact View - Always Visible */}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sort By */}
          <select
            value={filters.sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} {filters.sortBy === option.value && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </option>
            ))}
          </select>

          {/* Quick Bus Type Filter */}
          <div className="flex gap-1">
            {BUS_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => toggleArrayFilter('busTypes', type.id)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  filters.busTypes.includes(type.id)
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Active Filter Tags */}
          {filters.timeSlots.map(slot => {
            const timeSlot = TIME_SLOTS.find(t => t.id === slot);
            return (
              <span
                key={slot}
                className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full"
              >
                <Clock className="h-3 w-3" />
                {timeSlot?.label}
                <button
                  onClick={() => toggleArrayFilter('timeSlots', slot)}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          {filters.amenities.slice(0, 3).map(amenity => {
            const amenityConfig = AMENITIES.find(a => a.id === amenity);
            return (
              <span
                key={amenity}
                className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full"
              >
                {amenityConfig && <amenityConfig.icon className="h-3 w-3" />}
                {amenityConfig?.label}
                <button
                  onClick={() => toggleArrayFilter('amenities', amenity)}
                  className="hover:text-green-900 dark:hover:text-green-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          {filters.amenities.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{filters.amenities.length - 3} more amenities
            </span>
          )}
        </div>
      </div>

      {/* Extended Filters */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-6">
          {/* Price Range Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Price Range
              </label>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {formatCurrency(filters.priceRange.min)} - {formatCurrency(filters.priceRange.max)}
              </span>
            </div>

            {/* Price Presets */}
            <div className="flex gap-2 mb-3">
              {PRICE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => updatePriceRange(preset.min, preset.max)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    filters.priceRange.min === preset.min && filters.priceRange.max === preset.max
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Dual Range Slider */}
            <div className="relative">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full relative">
                <div
                  className="absolute h-2 bg-blue-500 rounded-full"
                  style={{
                    left: `${getSliderPercentage(filters.priceRange.min)}%`,
                    width: `${getSliderPercentage(filters.priceRange.max) - getSliderPercentage(filters.priceRange.min)}%`,
                  }}
                />
              </div>
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={filters.priceRange.min}
                onChange={(e) => handlePriceSliderChange(e, 'min')}
                className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
              />
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={filters.priceRange.max}
                onChange={(e) => handlePriceSliderChange(e, 'max')}
                className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Departure Time Filter */}
          <div>
            <label className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              Departure Time
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => toggleArrayFilter('timeSlots', slot.id)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    filters.timeSlots.includes(slot.id)
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium text-sm">{slot.label}</div>
                  <div className="text-xs opacity-75">{slot.range}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bus Type Filter */}
          <div>
            <label className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Bus className="h-4 w-4" />
              Bus Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {BUS_TYPES.map(type => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => toggleArrayFilter('busTypes', type.id)}
                    className={`p-4 text-left border rounded-lg transition-colors flex items-center gap-3 ${
                      filters.busTypes.includes(type.id)
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm opacity-75">{type.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amenities Filter */}
          <div>
            <label className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Wifi className="h-4 w-4" />
              Amenities
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AMENITIES.map(amenity => {
                const IconComponent = amenity.icon;
                return (
                  <button
                    key={amenity.id}
                    onClick={() => toggleArrayFilter('amenities', amenity.id)}
                    className={`p-3 text-left border rounded-lg transition-colors flex items-center gap-2 ${
                      filters.amenities.includes(amenity.id)
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="text-sm font-medium">{amenity.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to check if a trip matches the current filters
export const doesTripMatchFilters = (trip: any, filters: TripFiltersState): boolean => {
  // Price filter
  if (trip.price < filters.priceRange.min || trip.price > filters.priceRange.max) {
    return false;
  }

  // Bus type filter
  if (filters.busTypes.length > 0 && !filters.busTypes.includes(trip.busType.toLowerCase())) {
    return false;
  }

  // Time slot filter
  if (filters.timeSlots.length > 0) {
    const departureHour = parseInt(trip.departure.split(':')[0]);
    const matchesTimeSlot = filters.timeSlots.some(slotId => {
      const slot = TIME_SLOTS.find(s => s.id === slotId);
      if (!slot) return false;
      
      if (slot.id === 'night') {
        // Night slot spans midnight (21:00 - 05:00)
        return departureHour >= 21 || departureHour < 5;
      }
      
      return departureHour >= slot.hours[0] && departureHour < slot.hours[1];
    });
    
    if (!matchesTimeSlot) return false;
  }

  // Amenities filter
  if (filters.amenities.length > 0) {
    const tripAmenities = trip.amenities.map((a: string) => {
      // Normalize amenity names to match our filter IDs
      switch (a.toLowerCase()) {
        case 'wifi': return 'wifi';
        case 'ac': return 'ac';
        case 'usb charging': return 'usb-charging';
        case 'reclining seats': return 'reclining-seats';
        case 'sleeper beds': return 'sleeper-beds';
        case 'snacks': return 'snacks';
        case 'water': return 'water';
        case 'blanket': return 'blanket';
        case 'pillow': return 'pillow';
        default: return a.toLowerCase().replace(/\s+/g, '-');
      }
    });

    const hasRequiredAmenities = filters.amenities.every(requiredAmenity =>
      tripAmenities.includes(requiredAmenity)
    );
    
    if (!hasRequiredAmenities) return false;
  }

  return true;
};

// Helper function to sort trips based on filters
export const sortTrips = (trips: any[], filters: TripFiltersState): any[] => {
  return [...trips].sort((a, b) => {
    let comparison = 0;

    switch (filters.sortBy) {
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'departure':
        comparison = a.departure.localeCompare(b.departure);
        break;
      case 'arrival':
        comparison = a.arrival.localeCompare(b.arrival);
        break;
      case 'duration':
        comparison = a.duration.localeCompare(b.duration);
        break;
      case 'rating':
        comparison = b.rating - a.rating; // Higher rating first
        break;
      case 'availability':
        comparison = b.availableSeats - a.availableSeats; // More available seats first
        break;
      default:
        return 0;
    }

    return filters.sortOrder === 'desc' ? -comparison : comparison;
  });
};