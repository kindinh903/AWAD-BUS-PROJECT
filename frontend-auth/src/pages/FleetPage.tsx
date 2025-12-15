import { Link } from 'react-router-dom';
import {
    Wifi, Tv, Coffee, Plug, Wind, Music,
    Users, Shield, Star, ArrowRight, Check
} from 'lucide-react';

interface BusType {
    name: string;
    description: string;
    seats: number;
    priceRange: string;
    image: string;
    amenities: { icon: React.ReactNode; name: string }[];
    features: string[];
    popular?: boolean;
}

const busTypes: BusType[] = [
    {
        name: 'Standard',
        description: 'Comfortable and affordable travel for everyday journeys',
        seats: 45,
        priceRange: '80,000 - 150,000 ₫',
        image: '🚌',
        amenities: [
            { icon: <Wind className="h-4 w-4" />, name: 'Air Conditioning' },
            { icon: <Users className="h-4 w-4" />, name: 'Reclining Seats' },
        ],
        features: ['Comfortable seating', 'Overhead storage', 'Regular stops'],
    },
    {
        name: 'VIP',
        description: 'Premium comfort with extra legroom and entertainment',
        seats: 35,
        priceRange: '150,000 - 300,000 ₫',
        image: '🚎',
        amenities: [
            { icon: <Wind className="h-4 w-4" />, name: 'Air Conditioning' },
            { icon: <Wifi className="h-4 w-4" />, name: 'Free WiFi' },
            { icon: <Tv className="h-4 w-4" />, name: 'Personal TV' },
            { icon: <Coffee className="h-4 w-4" />, name: 'Snacks & Drinks' },
        ],
        features: ['Extra legroom', 'USB charging', 'Complimentary snacks', 'Entertainment system'],
        popular: true,
    },
    {
        name: 'Sleeper',
        description: 'Lie-flat beds for overnight long-distance travel',
        seats: 24,
        priceRange: '250,000 - 450,000 ₫',
        image: '🛏️',
        amenities: [
            { icon: <Wind className="h-4 w-4" />, name: 'Air Conditioning' },
            { icon: <Wifi className="h-4 w-4" />, name: 'Free WiFi' },
            { icon: <Plug className="h-4 w-4" />, name: 'Power Outlets' },
            { icon: <Music className="h-4 w-4" />, name: 'Personal Audio' },
        ],
        features: ['180° lie-flat bed', 'Blanket & pillow', 'Privacy curtains', 'Reading light'],
    },
];

const fleetStats = [
    { label: 'Total Buses', value: '200+' },
    { label: 'Daily Departures', value: '1,000+' },
    { label: 'Routes Covered', value: '500+' },
    { label: 'Years of Service', value: '15+' },
];

export default function FleetPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">Our Fleet</h1>
                    <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
                        Modern, well-maintained buses designed for your comfort and safety
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="container mx-auto px-4 -mt-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                    {fleetStats.map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bus Types */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Choose Your Comfort Level
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            We have the perfect bus for every type of traveler
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {busTypes.map((bus) => (
                            <div
                                key={bus.name}
                                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${bus.popular ? 'ring-2 ring-blue-500' : ''
                                    }`}
                            >
                                {bus.popular && (
                                    <div className="absolute top-4 right-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                        <Star className="h-3 w-3" /> Popular
                                    </div>
                                )}

                                <div className="p-8">
                                    <div className="text-6xl mb-4">{bus.image}</div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{bus.name}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">{bus.description}</p>

                                    <div className="flex items-center gap-4 mb-6 text-sm">
                                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                            <Users className="h-4 w-4" />
                                            {bus.seats} seats
                                        </span>
                                        <span className="font-semibold text-blue-600">{bus.priceRange}</span>
                                    </div>

                                    {/* Amenities */}
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {bus.amenities.map((amenity, i) => (
                                            <span
                                                key={i}
                                                className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300"
                                            >
                                                {amenity.icon}
                                                {amenity.name}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-2 mb-6">
                                        {bus.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Check className="h-4 w-4 text-green-500" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <Link
                                        to={`/routes?bus_type=${bus.name.toLowerCase()}`}
                                        className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                                    >
                                        Browse {bus.name} Buses
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Safety Section */}
            <section className="py-16 bg-white dark:bg-gray-800">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full mb-4">
                                <Shield className="h-5 w-5" />
                                Safety First
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                Your Safety is Our Priority
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                All our buses undergo regular safety inspections and are equipped with modern safety features.
                                Our drivers are trained professionals with years of experience.
                            </p>
                            <ul className="space-y-3">
                                {[
                                    'Regular vehicle maintenance and inspection',
                                    'GPS tracking on all buses',
                                    'Trained and licensed drivers',
                                    'Emergency response protocols',
                                    'Insurance coverage for all passengers',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                        <Check className="h-5 w-5 text-green-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1">
                            <div className="bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-3xl p-12 text-center">
                                <div className="text-8xl mb-4">🛡️</div>
                                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">100%</div>
                                <div className="text-gray-600 dark:text-gray-400">Safety Compliant</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Travel?</h2>
                    <p className="text-blue-100 mb-8 max-w-xl mx-auto">
                        Book your next journey with us and experience the difference
                    </p>
                    <Link
                        to="/routes"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                    >
                        Browse All Routes <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
