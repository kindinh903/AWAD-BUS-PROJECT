import React from 'react';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  User, 
  Bus,
  Star,
  Heart,
  Ticket,
  Navigation
} from 'lucide-react';

interface UserDashboardProps {
  user: any;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="h-8 w-8" />
              My Travel Dashboard
            </h1>
            <p className="text-blue-100 mt-2">
              Welcome back, {user?.name || 'Traveler'}! Ready for your next journey?
            </p>
          </div>
          <div className="text-right">
            <div className="bg-blue-700 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold">PASSENGER</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Trips</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <Bus className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Loyalty Points</p>
              <p className="text-2xl font-bold text-gray-900">2,450</p>
            </div>
            <Star className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Saved Routes</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
            <Heart className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Book New Trip */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Ticket className="h-6 w-6 text-blue-600" />
            Book Your Next Trip
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Departure city"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Destination city"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input 
                    type="date" 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <select className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Morning (6-12)</option>
                    <option>Afternoon (12-18)</option>
                    <option>Evening (18-24)</option>
                  </select>
                </div>
              </div>
            </div>
            <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md">
              Search Buses
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6 text-green-600" />
            Recent Bookings
          </h2>
          <div className="space-y-3">
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-green-700">Ho Chi Minh → Da Nang</div>
                  <div className="text-sm text-green-600">Dec 25, 2024 • 08:30 AM</div>
                  <div className="text-xs text-green-500 mt-1">✓ Confirmed</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-700">$25.00</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-blue-700">Hanoi → Hai Phong</div>
                  <div className="text-sm text-blue-600">Dec 20, 2024 • 14:15 PM</div>
                  <div className="text-xs text-blue-500 mt-1">✓ Completed</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-700">$15.00</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-400">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-700">Da Nang → Hue</div>
                  <div className="text-sm text-gray-600">Dec 15, 2024 • 10:00 AM</div>
                  <div className="text-xs text-gray-500 mt-1">✓ Completed</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-700">$12.00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg hover:from-blue-200 hover:to-blue-300 transition-all duration-200 text-center">
            <CreditCard className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="font-semibold text-blue-700">Payment Methods</div>
            <div className="text-xs text-blue-600 mt-1">Manage cards & wallets</div>
          </button>

          <button className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-lg hover:from-green-200 hover:to-green-300 transition-all duration-200 text-center">
            <Star className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="font-semibold text-green-700">Loyalty Program</div>
            <div className="text-xs text-green-600 mt-1">View points & rewards</div>
          </button>

          <button className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg hover:from-purple-200 hover:to-purple-300 transition-all duration-200 text-center">
            <Heart className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="font-semibold text-purple-700">Saved Routes</div>
            <div className="text-xs text-purple-600 mt-1">Your favorite trips</div>
          </button>

          <button className="p-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg hover:from-orange-200 hover:to-orange-300 transition-all duration-200 text-center">
            <User className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="font-semibold text-orange-700">Profile Settings</div>
            <div className="text-xs text-orange-600 mt-1">Update your info</div>
          </button>
        </div>
      </div>
    </div>
  );
};