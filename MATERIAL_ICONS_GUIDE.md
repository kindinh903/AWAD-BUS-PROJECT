# Using Google Material Icons 🎨

## Quick Reference

### Import Icons
```tsx
// From Material-UI (Google's Material Design Icons)
import SearchIcon from '@mui/icons-material/Search';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PaymentIcon from '@mui/icons-material/Payment';
import StarIcon from '@mui/icons-material/Star';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HomeIcon from '@mui/icons-material/Home';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
```

### Usage
```tsx
// Basic usage (default size is 24px)
<SearchIcon />

// With custom size
<DirectionsBusIcon sx={{ fontSize: 40 }} />
<PersonIcon style={{ fontSize: '20px' }} />

// With Tailwind classes (add className)
<SearchIcon className="h-5 w-5 text-blue-600" />

// With color
<FavoriteIcon color="primary" />
<StarIcon color="warning" />
<ErrorIcon color="error" />
```

## Popular Icons for Bus Booking

### Navigation & Actions
- `DirectionsBusIcon` - Bus/Transit
- `SearchIcon` - Search
- `MenuIcon` - Menu
- `CloseIcon` - Close
- `ArrowForwardIcon` / `ArrowBackIcon` - Navigation
- `HomeIcon` - Home

### Booking Related
- `ConfirmationNumberIcon` - Tickets
- `EventIcon` / `CalendarTodayIcon` - Date
- `LocationOnIcon` / `PlaceIcon` - Location
- `PersonIcon` / `PersonOutlineIcon` - User
- `AirlineSeatReclineNormalIcon` - Seats

### Payment
- `PaymentIcon` - Payment
- `CreditCardIcon` - Credit Card
- `AccountBalanceWalletIcon` - Wallet
- `MonetizationOnIcon` - Money

### Status & Feedback
- `CheckCircleIcon` / `CheckIcon` - Success
- `ErrorIcon` / `CancelIcon` - Error
- `WarningIcon` - Warning
- `InfoIcon` - Information
- `HourglassEmptyIcon` - Pending

### Ratings & Social
- `StarIcon` / `StarBorderIcon` - Rating
- `FavoriteIcon` / `FavoriteBorderIcon` - Favorite
- `ShareIcon` - Share
- `ThumbUpIcon` - Like

### Communication
- `EmailIcon` / `MailOutlineIcon` - Email
- `PhoneIcon` - Phone
- `ChatIcon` - Chat
- `NotificationsIcon` - Notifications

### Utilities
- `DownloadIcon` - Download
- `PrintIcon` - Print
- `MoreVertIcon` - More options
- `SettingsIcon` - Settings
- `LogoutIcon` - Logout
- `LoginIcon` - Login

## Icon Variants

Most icons have 3 variants:
1. **Filled** (default): `StarIcon`
2. **Outlined**: `StarOutlineIcon` 
3. **Rounded**: `StarRoundedIcon`
4. **TwoTone**: `StarTwoToneIcon`
5. **Sharp**: `StarSharpIcon`

## Sizing with Tailwind

Since MUI icons use inline SVG, you can style them with Tailwind:

```tsx
<SearchIcon className="h-4 w-4" />  // 16px
<SearchIcon className="h-5 w-5" />  // 20px (common for buttons)
<SearchIcon className="h-6 w-6" />  // 24px (default)
<SearchIcon className="h-8 w-8" />  // 32px
<SearchIcon className="h-12 w-12" /> // 48px (large)
```

## Browse All Icons

**Official Gallery:** https://mui.com/material-ui/material-icons/

Search for any icon you need - there are 2000+ icons available!

## Example Replacements

### Old (Lucide)
```tsx
import { Search, Bus, User, MapPin } from 'lucide-react';

<Search className="h-5 w-5" />
<Bus className="h-6 w-6" />
```

### New (Material Icons)
```tsx
import SearchIcon from '@mui/icons-material/Search';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';

<SearchIcon className="h-5 w-5" />
<DirectionsBusIcon className="h-6 w-6" />
```

## Mix and Match

You can use both Lucide and Material Icons in the same project! Use Material Icons for primary UI elements and keep Lucide for specific cases if needed.
