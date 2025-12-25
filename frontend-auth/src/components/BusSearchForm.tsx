import React, { useState, useRef, useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExploreIcon from '@mui/icons-material/Explore';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PeopleIcon from '@mui/icons-material/People';

// Vietnam cities for autocomplete
const vietnameseCities = [
  'Ho Chi Minh City',
  'Hanoi',
  'Da Nang',
  'Hai Phong',
  'Can Tho',
  'Nha Trang',
  'Hue',
  'Vung Tau',
  'Dalat',
  'Phu Quoc',
  'Quy Nhon',
  'Buon Ma Thuot',
  'My Tho',
  'Rach Gia',
  'Long Xuyen',
  'Chau Doc',
  'Vinh Long',
  'Cao Lanh',
  'Ben Tre',
  'Tra Vinh',
  'Soc Trang',
  'Bac Lieu',
  'Ca Mau',
  'Dong Hoi',
  'Hoi An',
  'Tam Ky',
  'Kontum',
  'Pleiku',
  'Ban Me Thuot',
  'Phan Thiet',
  'Tuy Hoa',
  'Vinh',
  'Thanh Hoa',
  'Nam Dinh',
  'Hai Duong',
  'Hung Yen',
  'Bac Ninh',
  'Thai Nguyen',
  'Lang Son',
  'Cao Bang',
  'Ha Giang',
  'Lao Cai',
  'Yen Bai',
  'Dien Bien Phu',
  'Son La',
  'Hoa Binh',
  'Ha Nam',
  'Ninh Binh',
  'Dong Hoi',
];

interface SearchFormProps {
  onSearch?: (searchData: SearchData) => void;
  className?: string;
}

export interface SearchData {
  from: string;
  to: string;
  date: string;
  passengers: number;
}

export const BusSearchForm: React.FC<SearchFormProps> = ({
  onSearch,
  className = '',
}) => {
  const [searchData, setSearchData] = useState<SearchData>({
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    passengers: 1,
  });

  const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
  const [toSuggestions, setToSuggestions] = useState<string[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [activeFromIndex, setActiveFromIndex] = useState(-1);
  const [activeToIndex, setActiveToIndex] = useState(-1);

  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const fromSuggestionsRef = useRef<HTMLDivElement>(null);
  const toSuggestionsRef = useRef<HTMLDivElement>(null);

  // Filter cities based on input
  const filterCities = (input: string, exclude?: string): string[] => {
    if (!input.trim()) return [];
    
    return vietnameseCities
      .filter(city => 
        city.toLowerCase().includes(input.toLowerCase()) &&
        city !== exclude
      )
      .slice(0, 8); // Limit to 8 suggestions
  };

  // Handle input changes and show suggestions
  const handleFromChange = (value: string) => {
    setSearchData(prev => ({ ...prev, from: value }));
    const suggestions = filterCities(value, searchData.to);
    setFromSuggestions(suggestions);
    setShowFromSuggestions(suggestions.length > 0);
    setActiveFromIndex(-1);
  };

  const handleToChange = (value: string) => {
    setSearchData(prev => ({ ...prev, to: value }));
    const suggestions = filterCities(value, searchData.from);
    setToSuggestions(suggestions);
    setShowToSuggestions(suggestions.length > 0);
    setActiveToIndex(-1);
  };

  // Handle keyboard navigation
  const handleFromKeyDown = (e: React.KeyboardEvent) => {
    if (!showFromSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveFromIndex(prev => 
          prev < fromSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveFromIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeFromIndex >= 0) {
          selectFromSuggestion(fromSuggestions[activeFromIndex]);
        }
        break;
      case 'Escape':
        setShowFromSuggestions(false);
        setActiveFromIndex(-1);
        break;
    }
  };

  const handleToKeyDown = (e: React.KeyboardEvent) => {
    if (!showToSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveToIndex(prev => 
          prev < toSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveToIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeToIndex >= 0) {
          selectToSuggestion(toSuggestions[activeToIndex]);
        }
        break;
      case 'Escape':
        setShowToSuggestions(false);
        setActiveToIndex(-1);
        break;
    }
  };

  // Select suggestion
  const selectFromSuggestion = (city: string) => {
    setSearchData(prev => ({ ...prev, from: city }));
    setShowFromSuggestions(false);
    setActiveFromIndex(-1);
    toInputRef.current?.focus();
  };

  const selectToSuggestion = (city: string) => {
    setSearchData(prev => ({ ...prev, to: city }));
    setShowToSuggestions(false);
    setActiveToIndex(-1);
  };

  // Swap cities
  const swapCities = () => {
    setSearchData(prev => ({
      ...prev,
      from: prev.to,
      to: prev.from,
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchData.from || !searchData.to) {
      alert('Please select both departure and destination cities');
      return;
    }

    if (searchData.from === searchData.to) {
      alert('Departure and destination cities cannot be the same');
      return;
    }

    onSearch?.(searchData);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fromSuggestionsRef.current &&
        !fromSuggestionsRef.current.contains(event.target as Node) &&
        !fromInputRef.current?.contains(event.target as Node)
      ) {
        setShowFromSuggestions(false);
      }
      
      if (
        toSuggestionsRef.current &&
        !toSuggestionsRef.current.contains(event.target as Node) &&
        !toInputRef.current?.contains(event.target as Node)
      ) {
        setShowToSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`bg-white rounded-2xl shadow-2xl p-8 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <SearchIcon sx={{ fontSize: 24 }} className="text-blue-600" />
          Find Your Perfect Bus Trip
        </h2>
        <p className="text-gray-600">
          Search and book bus tickets across Vietnam with real-time availability
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Route Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* From City */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departure City
            </label>
            <div className="relative">
              <LocationOnIcon sx={{ fontSize: 20 }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <input
                ref={fromInputRef}
                type="text"
                value={searchData.from}
                onChange={(e) => handleFromChange(e.target.value)}
                onKeyDown={handleFromKeyDown}
                onFocus={() => {
                  if (searchData.from) {
                    const suggestions = filterCities(searchData.from, searchData.to);
                    setFromSuggestions(suggestions);
                    setShowFromSuggestions(suggestions.length > 0);
                  }
                }}
                placeholder="Enter departure city"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                autoComplete="off"
              />
              
              {/* From Suggestions */}
              {showFromSuggestions && fromSuggestions.length > 0 && (
                <div
                  ref={fromSuggestionsRef}
                  className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-64 overflow-y-auto z-50"
                >
                  {fromSuggestions.map((city, index) => (
                    <div
                      key={city}
                      onClick={() => selectFromSuggestion(city)}
                      className={`px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-blue-50 ${
                        index === activeFromIndex ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      } ${index === 0 ? 'rounded-t-xl' : ''} ${
                        index === fromSuggestions.length - 1 ? 'rounded-b-xl' : ''
                      }`}
                    >
                      <LocationOnIcon sx={{ fontSize: 16 }} className="text-gray-400" />
                      <span className="font-medium">{city}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <button
              type="button"
              onClick={swapCities}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors border-4 border-white"
              title="Swap cities"
            >
              <ArrowForwardIcon sx={{ fontSize: 16 }} className="transform rotate-90 md:rotate-0" />
            </button>
          </div>

          {/* To City */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination City
            </label>
            <div className="relative">
              <ExploreIcon sx={{ fontSize: 20 }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <input
                ref={toInputRef}
                type="text"
                value={searchData.to}
                onChange={(e) => handleToChange(e.target.value)}
                onKeyDown={handleToKeyDown}
                onFocus={() => {
                  if (searchData.to) {
                    const suggestions = filterCities(searchData.to, searchData.from);
                    setToSuggestions(suggestions);
                    setShowToSuggestions(suggestions.length > 0);
                  }
                }}
                placeholder="Enter destination city"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                autoComplete="off"
              />
              
              {/* To Suggestions */}
              {showToSuggestions && toSuggestions.length > 0 && (
                <div
                  ref={toSuggestionsRef}
                  className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-64 overflow-y-auto z-50"
                >
                  {toSuggestions.map((city, index) => (
                    <div
                      key={city}
                      onClick={() => selectToSuggestion(city)}
                      className={`px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-blue-50 ${
                        index === activeToIndex ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      } ${index === 0 ? 'rounded-t-xl' : ''} ${
                        index === toSuggestions.length - 1 ? 'rounded-b-xl' : ''
                      }`}
                    >
                      <ExploreIcon sx={{ fontSize: 16 }} className="text-gray-400" />
                      <span className="font-medium">{city}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Swap Button for Mobile */}
          <div className="md:hidden flex justify-center">
            <button
              type="button"
              onClick={swapCities}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              title="Swap cities"
            >
              <ArrowForwardIcon sx={{ fontSize: 16 }} className="transform rotate-90" />
              Swap
            </button>
          </div>
        </div>

        {/* Date and Passengers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departure Date
            </label>
            <div className="relative">
              <CalendarTodayIcon sx={{ fontSize: 20 }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={searchData.date}
                onChange={(e) => setSearchData(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passengers
            </label>
            <div className="relative">
              <PeopleIcon sx={{ fontSize: 20 }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={searchData.passengers}
                onChange={(e) => setSearchData(prev => ({ ...prev, passengers: parseInt(e.target.value) }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg appearance-none bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Passenger' : 'Passengers'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search Button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          <SearchIcon sx={{ fontSize: 20 }} />
          Search Buses
        </button>
      </form>

      {/* Popular Routes */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Popular Routes</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { from: 'Ho Chi Minh City', to: 'Da Nang' },
            { from: 'Hanoi', to: 'Hai Phong' },
            { from: 'Da Nang', to: 'Hue' },
            { from: 'Ho Chi Minh City', to: 'Nha Trang' },
          ].map((route, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setSearchData(prev => ({
                  ...prev,
                  from: route.from,
                  to: route.to,
                }));
              }}
              className="text-sm bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-3 py-2 rounded-lg transition-colors"
            >
              {route.from} → {route.to}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};