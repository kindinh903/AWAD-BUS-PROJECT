import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Gift, Clock, Copy, Check, Sparkles,
    ArrowRight, Star, Ticket
} from 'lucide-react';

interface Promotion {
    id: string;
    code: string;
    title: string;
    description: string;
    discount: string;
    validUntil: string;
    minOrder?: number;
    maxDiscount?: number;
    type: 'percentage' | 'fixed';
    featured?: boolean;
}

const promotions: Promotion[] = [
    {
        id: '1',
        code: 'SAVE20',
        title: 'First Booking Special',
        description: 'Get 20% off your first booking! New customers only.',
        discount: '20%',
        validUntil: '2024-12-31',
        type: 'percentage',
        maxDiscount: 100000,
        featured: true,
    },
    {
        id: '2',
        code: 'WEEKEND15',
        title: 'Weekend Getaway',
        description: 'Save 15% on weekend trips (Fri-Sun departures)',
        discount: '15%',
        validUntil: '2024-12-31',
        type: 'percentage',
    },
    {
        id: '3',
        code: 'VIP50K',
        title: 'VIP Bus Discount',
        description: 'Get 50,000₫ off any VIP bus booking',
        discount: '50,000₫',
        validUntil: '2024-12-31',
        type: 'fixed',
        minOrder: 200000,
    },
    {
        id: '4',
        code: 'FAMILY10',
        title: 'Family Travel',
        description: '10% off when booking 4+ seats',
        discount: '10%',
        validUntil: '2024-12-31',
        type: 'percentage',
    },
    {
        id: '5',
        code: 'SLEEPER100',
        title: 'Sleeper Bus Deal',
        description: '100,000₫ off sleeper bus bookings',
        discount: '100,000₫',
        validUntil: '2024-12-31',
        type: 'fixed',
        minOrder: 300000,
    },
];

function PromoCard({ promo }: { promo: Promotion }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(promo.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden ${promo.featured ? 'ring-2 ring-orange-500' : ''
            }`}>
            {promo.featured && (
                <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-center py-2 text-sm font-medium">
                    <Sparkles className="inline h-4 w-4 mr-1" /> Featured Offer
                </div>
            )}
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{promo.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{promo.description}</p>
                    </div>
                    <div className="text-right">
                        <div className={`text-2xl font-bold ${promo.type === 'percentage' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                            {promo.discount}
                        </div>
                        <div className="text-xs text-gray-500">OFF</div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    Valid until {new Date(promo.validUntil).toLocaleDateString()}
                </div>

                {(promo.minOrder || promo.maxDiscount) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        {promo.minOrder && <span>Min. order: {promo.minOrder.toLocaleString()}₫</span>}
                        {promo.minOrder && promo.maxDiscount && <span> • </span>}
                        {promo.maxDiscount && <span>Max discount: {promo.maxDiscount.toLocaleString()}₫</span>}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 font-mono font-bold text-lg text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                        {promo.code}
                    </div>
                    <button
                        onClick={handleCopy}
                        className={`px-4 py-3 rounded-lg font-medium transition-colors ${copied
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PromotionsPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white py-16 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                </div>
                <div className="container mx-auto px-4 text-center relative">
                    <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-4">
                        <Gift className="h-5 w-5" />
                        <span>Special Offers</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">Deals & Promotions</h1>
                    <p className="text-xl text-orange-100 max-w-2xl mx-auto">
                        Save more on your travels with our exclusive offers and discount codes
                    </p>
                </div>
            </div>

            {/* Promo Code Input */}
            <div className="container mx-auto px-4 mt-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Have a promo code?
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter your code"
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                                <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors">
                                    Apply
                                </button>
                            </div>
                        </div>
                        <div className="hidden md:block w-px h-16 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="text-center">
                            <Ticket className="h-12 w-12 text-orange-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">Enter at checkout</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Promotions Grid */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {promotions.map((promo) => (
                            <PromoCard key={promo.id} promo={promo} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Loyalty Program */}
            <section className="py-16 bg-white dark:bg-gray-800">
                <div className="container mx-auto px-4">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-4">
                                    <Star className="h-5 w-5" />
                                    <span>Loyalty Program</span>
                                </div>
                                <h2 className="text-3xl font-bold mb-4">Join BusBooking Rewards</h2>
                                <p className="text-purple-100 mb-6">
                                    Earn points on every booking and redeem them for free tickets, upgrades, and exclusive perks!
                                </p>
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-yellow-300" />
                                        1 point per 1,000₫ spent
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-yellow-300" />
                                        Birthday bonus points
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-yellow-300" />
                                        Priority boarding
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-yellow-300" />
                                        Exclusive member-only deals
                                    </li>
                                </ul>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    Sign Up Now <ArrowRight className="h-5 w-5" />
                                </Link>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="w-48 h-48 bg-white/20 rounded-3xl flex items-center justify-center">
                                    <div className="text-8xl">🏆</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Terms */}
            <section className="py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    * Terms and conditions apply. Offers may not be combined. Discount codes are subject to availability.
                </p>
            </section>
        </div>
    );
}
