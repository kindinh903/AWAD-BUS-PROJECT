# Modern UI Implementation Guide 🎨

## What We've Added

### 1. **Animation Library - Framer Motion**
- Smooth page transitions
- Micro-interactions on buttons and cards
- Professional feel with minimal code

### 2. **New Components**

#### **Button Component** (`components/ui/Button.tsx`)
Modern, animated button with multiple variants and states.

**Features:**
- 5 variants: `primary`, `secondary`, `outline`, `ghost`, `danger`
- 3 sizes: `sm`, `md`, `lg`
- Loading states with spinner
- Left/Right icons support
- Hover and tap animations
- Dark mode support

**Usage:**
```tsx
import { Button } from '../components/ui/Button';
import { Search, Download } from 'lucide-react';

// Basic button
<Button>Click me</Button>

// With variant and size
<Button variant="primary" size="lg">
  Search Trips
</Button>

// With loading state
<Button isLoading>
  Processing...
</Button>

// With icons
<Button 
  leftIcon={<Search className="h-4 w-4" />}
  rightIcon={<Download className="h-4 w-4" />}
>
  Download
</Button>

// Outline button
<Button variant="outline">
  Cancel
</Button>

// Danger button
<Button variant="danger">
  Delete
</Button>
```

#### **Card Component** (`components/ui/Card.tsx`)
Animated cards with glassmorphism support.

**Features:**
- 3 variants: `default`, `glass`, `bordered`
- Hover lift animation
- Composable sub-components

**Usage:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

<Card hover>
  <CardHeader>
    <CardTitle>Trip to Hanoi</CardTitle>
    <CardDescription>Departing tomorrow at 8:00 AM</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Your booking details...</p>
  </CardContent>
</Card>

// Glass effect card
<Card variant="glass">
  <p>Beautiful glassmorphism effect</p>
</Card>
```

#### **Badge Component** (`components/ui/Badge.tsx`)
Small status indicators with animations.

**Usage:**
```tsx
import { Badge } from '../components/ui/Badge';

<Badge variant="success">Confirmed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Cancelled</Badge>
<Badge variant="info" size="lg">New</Badge>
<Badge pulse>Live</Badge>
```

#### **PageTransition Component** (`components/PageTransition.tsx`)
Smooth fade-in transitions between routes.

**Already integrated in Layout.tsx** - all pages now have smooth transitions!

### 3. **Utility Function - cn()**
Located in `lib/utils.ts` - merges Tailwind classes intelligently.

**Usage:**
```tsx
import { cn } from '../lib/utils';

// Conditional classes
<div className={cn(
  "base-class",
  isActive && "active-class",
  isDisabled && "disabled-class"
)} />
```

---

## Quick Start Examples

### Replace Old Buttons
**Before:**
```tsx
<button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
  Search
</button>
```

**After:**
```tsx
<Button variant="primary">
  Search
</Button>
```

### Add Animation to Cards
**Before:**
```tsx
<div className="bg-white rounded-lg shadow p-6">
  Content
</div>
```

**After:**
```tsx
<Card hover>
  Content
</Card>
```

### Loading States
```tsx
const [loading, setLoading] = useState(false);

<Button isLoading={loading} onClick={handleSubmit}>
  {loading ? 'Booking...' : 'Book Now'}
</Button>
```

---

## Pro Tips for "Non-AI" Look

### 1. **Add Gradients**
```tsx
<Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
  Search
</Button>
```

### 2. **Use Glassmorphism**
```tsx
<Card variant="glass">
  Semi-transparent with blur
</Card>
```

### 3. **Micro-Interactions Everywhere**
All our buttons and cards already have subtle animations on hover/tap!

### 4. **Consistent Spacing**
Use the size prop consistently:
- Forms: `size="md"`
- Hero sections: `size="lg"`
- Inline actions: `size="sm"`

### 5. **Status Colors**
Use the Badge component for all status indicators:
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Expired</Badge>
```

---

## Where to Use These Components

### Priority Updates:
1. ✅ **HomePage** - Search button (already updated)
2. ✅ **Layout** - Page transitions (already integrated)
3. **LoginPage** - Login/Register buttons
4. **TripDetailsPage** - Book Now, Continue buttons
5. **BookingHistoryPage** - Download Tickets buttons
6. **UserDashboardPage** - All action buttons

### Example for TripDetailsPage:
```tsx
// Old
<button 
  onClick={handleContinue}
  className="w-full bg-blue-600 text-white py-3 rounded-lg"
>
  Continue to Passengers
</button>

// New
<Button 
  onClick={handleContinue}
  size="lg"
  className="w-full"
>
  Continue to Passengers
</Button>
```

---

## Additional Animation Ideas

### Stagger Children Animation
```tsx
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.div variants={container} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={item}>
      <Card>{item.content}</Card>
    </motion.div>
  ))}
</motion.div>
```

### Hover Scale Effect
```tsx
<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
  <img src={trip.image} alt={trip.name} />
</motion.div>
```

---

## Next Steps

1. **Update remaining pages** to use `Button` component
2. **Replace div cards** with `Card` component
3. **Add status badges** using `Badge` component
4. **Consider adding:**
   - Toast notifications (using `react-hot-toast` or `sonner`)
   - Loading skeletons
   - Empty state illustrations

---

## Resources

- **Framer Motion Docs:** https://www.framer.com/motion/
- **Tailwind Merge:** https://github.com/dcastil/tailwind-merge
- **shadcn/ui (for more components):** https://ui.shadcn.com/

Your site now has professional animations and a modern component library! 🚀
