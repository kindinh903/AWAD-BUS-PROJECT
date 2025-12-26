import React, { useState, useRef, useEffect } from 'react';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExploreIcon from '@mui/icons-material/Explore';
import { vietnameseCities } from '../config/cities';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  exclude?: string;
  icon?: 'origin' | 'destination';
  className?: string;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Enter city',
  exclude,
  icon = 'origin',
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter cities based on input
  const filterCities = (input: string): string[] => {
    if (!input.trim()) return [];
    return vietnameseCities
      .filter(city =>
        city.toLowerCase().includes(input.toLowerCase()) &&
        city !== exclude
      )
      .slice(0, 6);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    const filtered = filterCities(newValue);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setActiveIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) {
          selectSuggestion(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Select a suggestion
  const selectSuggestion = (city: string) => {
    onChange(city);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  // Handle focus
  const handleFocus = () => {
    if (value) {
      const filtered = filterCities(value);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputRef]);

  const Icon = icon === 'destination' ? ExploreIcon : LocationOnIcon;

  const baseInputClass = 'w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  const baseSuggestionClass = 'absolute top-full left-0 right-0 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto z-50';

  const getItemClass = (index: number) => {
    const active = index === activeIndex;
    return `px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-slate-600 ${
      active ? 'bg-blue-50 dark:bg-slate-600 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-200'
    }`;
  };

  return (
    <div className={`relative ${className}`}>
      <Icon sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        autoComplete="off"
        className={baseInputClass}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className={baseSuggestionClass}>
          {suggestions.map((city, index) => (
            <div
              key={city}
              onClick={() => selectSuggestion(city)}
              className={getItemClass(index)}
            >
              <Icon sx={{ fontSize: 12 }} className="text-gray-400" />
              <span className="text-sm">{city}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;
