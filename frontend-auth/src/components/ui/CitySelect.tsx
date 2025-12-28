import React from 'react';
import { vietnameseCities } from '../../config/cities';

interface CitySelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
}

export const CitySelect: React.FC<CitySelectProps> = ({ label, name, value, onChange, required }) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor={name}>
      {label}
    </label>
    <div className="relative">
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pr-10 pl-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
      >
        <option value="">Select a city</option>
        {vietnameseCities.map(city => (
          <option key={city} value={city}>{city}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg className="h-4 w-4 text-gray-400 dark:text-gray-300" fill="none" viewBox="0 0 20 20" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l3-3 3 3m0 6l-3 3-3-3" />
        </svg>
      </span>
    </div>
  </div>
);
