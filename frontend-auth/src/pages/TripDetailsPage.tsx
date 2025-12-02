import { useParams, useNavigate } from 'react-router-dom';
import { Bus, Wifi, Snowflake, UsbIcon, Coffee, Bed } from 'lucide-react';
import { mockBusTrips } from '../lib/mockData';

export default function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const trip = mockBusTrips.find(t => t.id === id);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <h2 className="text-xl font-bold mb-2">Trip not found</h2>
          <p className="text-gray-600 mb-4">The trip you're looking for doesn't exist or may have been removed.</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded">Go back</button>
        </div>
      </div>
    );
  }

  const amenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi className="h-5 w-5" />;
      case 'ac': return <Snowflake className="h-5 w-5" />;
      case 'usb charging': return <UsbIcon className="h-5 w-5" />;
      case 'snacks': return <Coffee className="h-5 w-5" />;
      case 'sleeper beds': return <Bed className="h-5 w-5" />;
      default: return <span className="h-5 w-5">•</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container-custom max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Bus className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold">{trip.from} → {trip.to}</h1>
              </div>
              <div className="text-sm text-gray-500 mb-4">{trip.company} • {trip.busType} • {trip.duration}</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Departure</div>
                  <div className="font-semibold">{trip.departure}</div>
                  <div className="text-xs text-gray-400">{trip.from}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Arrival</div>
                  <div className="font-semibold">{trip.arrival}</div>
                  <div className="text-xs text-gray-400">{trip.to}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded text-right">
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="text-2xl font-bold text-blue-600">${trip.price}</div>
                  <div className="text-xs text-gray-400">{trip.availableSeats}/{trip.totalSeats} seats</div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Route & Stops</h3>
                <div className="text-sm text-gray-600">Pickup and dropoff points will be shown here. (Mock data)</div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-3">
                  {trip.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded text-sm">
                      {amenityIcon(amenity)}
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Policies</h3>
                <ul className="text-sm text-gray-600 list-disc pl-5">
                  <li>Free cancellation up to 24 hours before departure.</li>
                  <li>Bring valid ID for verification at boarding.</li>
                  <li>Luggage policy: 1 small bag and 1 checked luggage.</li>
                </ul>
              </div>
            </div>

            <div className="w-56">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="text-xs text-gray-500">Trip Summary</div>
                <div className="text-lg font-bold text-blue-600 mt-2">${trip.price}</div>
                <div className="text-sm text-gray-600 mt-1">{trip.departure} • {trip.duration}</div>
                <div className="mt-3">
                  <button onClick={() => alert('Proceed to booking flow (not implemented)')} className="w-full bg-blue-600 text-white py-2 rounded-lg">Book Now</button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-2">Driver</div>
                <div className="font-medium">Nguyen Van A</div>
                <div className="text-xs text-gray-400">License: 30A-12345</div>
                <div className="mt-3 text-sm text-gray-500">Vehicle: {trip.company} • Plate: 29B-123.45</div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-900">← Back to results</button>
          </div>
        </div>
      </div>
    </div>
  );
}
