export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 mt-auto">
      <div className="container-custom">
        <div className="text-center">
          <h3 className="font-semibold text-white mb-2">Bus Booking System</h3>
          <p className="text-sm mb-4">
            Your trusted partner for bus ticket bookings
          </p>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          © {new Date().getFullYear()} Bus Booking. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
