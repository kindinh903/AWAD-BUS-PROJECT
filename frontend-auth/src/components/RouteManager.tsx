import React, { useState, useEffect } from 'react';
import { adminAPI } from '../lib/api';
import AddRoadIcon from '@mui/icons-material/AddRoad';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RouteIcon from '@mui/icons-material/Route';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StraightenIcon from '@mui/icons-material/Straighten';
import { Input } from './ui/Input';
import { CitySelect } from './ui/CitySelect';
import { Dialog } from './ui/Dialog';
import { Container, Section } from './ui/Container';

interface Route {
  id: string;
  origin: string;
  destination: string;
  duration_minutes: number;
  distance?: number;
  base_price: number;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface RouteFormData {
  origin: string;
  destination: string;
  durationMinutes: number;
  distance: string;
  basePrice: string;
  description: string;
}

export const RouteManager: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState<RouteFormData>({
    origin: '',
    destination: '',
    durationMinutes: 0,
    distance: '',
    basePrice: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setIsLoading(true);
    try {
      const response = await adminAPI.getAllRoutes();
      setRoutes(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch routes:', err);
      setError(err.response?.data?.error || 'Failed to load routes');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      origin: '',
      destination: '',
      durationMinutes: 0,
      distance: '',
      basePrice: '',
      description: '',
    });
    setEditingRoute(null);
    setError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      origin: route.origin,
      destination: route.destination,
      durationMinutes: route.duration_minutes,
      distance: route.distance?.toString() || '',
      basePrice: route.base_price.toString(),
      description: route.description || '',
    });
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    resetForm();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.origin.trim() || !formData.destination.trim()) {
      setError('Origin and destination are required');
      return;
    }

    if (formData.origin.trim() === formData.destination.trim()) {
      setError('Origin and destination must be different');
      return;
    }

    if (formData.durationMinutes <= 0) {
      setError('Duration must be greater than 0');
      return;
    }

    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      setError('Base price must be greater than 0');
      return;
    }

    try {
      const payload = {
        origin: formData.origin.trim(),
        destination: formData.destination.trim(),
        durationMinutes: Number(formData.durationMinutes),
        distance: formData.distance ? Number(formData.distance) : undefined,
        basePrice: Number(formData.basePrice),
        description: formData.description.trim() || undefined,
      };

      if (editingRoute) {
        await adminAPI.updateRoute(editingRoute.id, payload);
        setSuccess('Route updated successfully');
      } else {
        await adminAPI.createRoute(payload);
        setSuccess('Route created successfully');
      }

      fetchRoutes();
      setTimeout(() => {
        handleCloseDialog();
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to save route:', err);
      setError(err.response?.data?.error || 'Failed to save route');
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route? This action cannot be undone.')) {
      return;
    }

    try {
      await adminAPI.deleteRoute(routeId);
      setSuccess('Route deleted successfully');
      fetchRoutes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to delete route:', err);
      setError(err.response?.data?.error || 'Failed to delete route');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <Container className="dark:bg-gray-900">
      <Section className="bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <RouteIcon className="text-blue-600" />
              Route Management
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Create and manage bus routes</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <AddRoadIcon />
            New Route
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg text-green-800 dark:text-green-200">
            {success}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading routes...</p>
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <RouteIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: '48px' }} />
            <p className="text-gray-600 dark:text-gray-400">No routes found. Create your first route to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route) => (
              <div
                key={route.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {route.origin} → {route.destination}
                    </h3>
                    {route.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{route.description}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      route.is_active
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {route.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <AccessTimeIcon fontSize="small" />
                    <span>{formatDuration(route.duration_minutes)}</span>
                  </div>
                  {route.distance && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <StraightenIcon fontSize="small" />
                      <span>{route.distance} km</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white font-semibold">
                    <AttachMoneyIcon fontSize="small" />
                    <span>{formatPrice(route.base_price)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleOpenEdit(route)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                  >
                    <EditIcon fontSize="small" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(route.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
                  >
                    <DeleteIcon fontSize="small" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={handleCloseDialog}
        title={editingRoute ? 'Edit Route' : 'Create New Route'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded text-green-800 dark:text-green-200 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <CitySelect
              label="From (Origin)"
              name="origin"
              value={formData.origin}
              onChange={e => setFormData(prev => ({ ...prev, origin: e.target.value }))}
              required
            />
            <CitySelect
              label="To (Destination)"
              name="destination"
              value={formData.destination}
              onChange={e => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (minutes)"
              name="durationMinutes"
              type="number"
              value={formData.durationMinutes}
              onChange={handleInputChange}
              placeholder="720"
              min="1"
              required
            />
            <Input
              label="Distance (km)"
              name="distance"
              type="number"
              value={formData.distance}
              onChange={handleInputChange}
              placeholder="180"
              step="0.1"
            />
          </div>

          <Input
            label="Base Price (VND)"
            name="basePrice"
            type="number"
            value={formData.basePrice}
            onChange={handleInputChange}
            placeholder="500000"
            min="0"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              placeholder="e.g., Express route with rest stops"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseDialog}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingRoute ? 'Update Route' : 'Create Route'}
            </button>
          </div>
        </form>
      </Dialog>
    </Container>
  );
};
