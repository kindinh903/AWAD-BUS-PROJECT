# Bus Search Interface Documentation

## Overview

The bus search interface has been implemented on the Homepage with advanced autocomplete functionality for Vietnamese cities. Users can search for bus routes, select dates, and specify passenger counts before being redirected to the dashboard for results.

## Features Implemented

### 1. BusSearchForm Component (`/src/components/BusSearchForm.tsx`)

#### Key Features:
- **Smart Autocomplete**: Real-time city suggestions as users type
- **Keyboard Navigation**: Arrow keys, Enter, and Escape support
- **City Swap**: Easy route reversal with swap button
- **Date Picker**: Prevents past date selection
- **Passenger Selection**: 1-10 passenger options
- **Popular Routes**: Quick selection buttons for common routes
- **Validation**: Form validation with user-friendly messages

#### Cities Supported:
- Major cities: Ho Chi Minh City, Hanoi, Da Nang, Hai Phong
- Tourist destinations: Nha Trang, Hue, Dalat, Phu Quoc, Hoi An
- Regional centers: Can Tho, Vinh, Thanh Hoa, and 40+ more cities

#### Technical Implementation:
- React hooks for state management
- Real-time filtering with excludes (prevents same departure/destination)
- Click-outside detection for dropdown closure
- Responsive design with mobile-specific UI elements
- CSS transitions and hover effects

### 2. Homepage Integration (`/src/pages/HomePage.tsx`)

#### Updates:
- Added search form as prominent section after hero
- Enhanced features section with bus-specific benefits
- Search data handling and localStorage storage
- Automatic redirect to dashboard after search

#### Features Section:
- Wide Network: 50+ destinations
- Real-Time Updates: Live tracking and notifications  
- Secure Payments: Industry-standard security
- Best Prices: Multi-operator comparison

### 3. Dashboard Integration (`/src/components/UserDashboard.tsx`)

#### Auto-Search Feature:
- Detects search data from localStorage on load
- Automatically populates search form
- Triggers search results if complete data available
- Clears stored search after use

## User Flow

1. **Homepage Search**: User enters departure/destination with autocomplete
2. **Route Selection**: Cities auto-suggest, keyboard navigation supported
3. **Date & Passengers**: Select travel date and passenger count
4. **Search Submission**: Form validates and redirects to dashboard
5. **Results Display**: Dashboard auto-loads search results
6. **Booking Process**: User can filter, sort, and book from results

## Technical Details

### Search Data Structure:
```typescript
interface SearchData {
  from: string;
  to: string;
  date: string;
  passengers: number;
}
```

### Autocomplete Implementation:
- Filters cities based on partial matches
- Excludes opposite city to prevent same departure/destination
- Limits to 8 suggestions for performance
- Supports Vietnamese city names with diacritics

### Responsive Design:
- Desktop: Side-by-side inputs with center swap button
- Mobile: Stacked inputs with horizontal swap button
- Touch-friendly tap targets
- Optimized dropdown positioning

## Future Enhancements

### Planned Features:
1. **Search History**: Remember recent searches
2. **Favorite Routes**: Save frequently used routes
3. **Price Alerts**: Notify users of price changes
4. **Advanced Filters**: Time preferences, bus amenities
5. **Map Integration**: Visual route selection
6. **Voice Search**: Speech-to-text input support

### Technical Improvements:
1. **API Integration**: Connect to real bus booking APIs
2. **Caching**: City and route data caching
3. **Analytics**: Search behavior tracking
4. **A/B Testing**: Form layout optimization
5. **Performance**: Lazy loading and code splitting

## Usage Examples

### Basic Search:
```jsx
<BusSearchForm 
  onSearch={(data) => console.log(data)} 
  className="max-w-4xl mx-auto"
/>
```

### With Custom Handler:
```jsx
const handleSearch = (searchData) => {
  // Process search data
  localStorage.setItem('busSearch', JSON.stringify(searchData));
  navigate('/results');
};

<BusSearchForm onSearch={handleSearch} />
```

## Testing

### Manual Test Cases:
1. **Autocomplete**: Type partial city names, verify suggestions
2. **Keyboard Navigation**: Use arrow keys and Enter in dropdowns  
3. **Validation**: Try submitting empty form, same cities
4. **Swap Function**: Test city swapping with populated fields
5. **Mobile UI**: Test responsive behavior on different screen sizes
6. **Search Flow**: Complete search on homepage, verify dashboard results

### Accessibility:
- Screen reader compatible labels
- Keyboard navigation support
- Focus management in dropdowns
- Color contrast compliance
- Touch target sizing

The search interface provides a comprehensive, user-friendly solution for bus route discovery with modern UX patterns and Vietnamese city support.