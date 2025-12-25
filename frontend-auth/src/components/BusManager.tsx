import React, { useState, useEffect } from 'react';
import { adminAPI } from '../lib/api';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import BlockIcon from '@mui/icons-material/Block';
import GridOnIcon from '@mui/icons-material/GridOn';
import { Input } from './ui/Input';
import { Dialog } from './ui/Dialog';
import { Container, Section } from './ui/Container';

interface Bus {
  id: string;
  name: string;
  plate_number: string;
  seat_map_id?: string;
  total_seats: number;
  bus_type: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
  seat_map?: {
    id: string;
    name: string;
    total_seats: number;
  };
}

interface BusFormData {
  name: string;
  plateNumber: string;
  totalSeats: number;
  busType: string;
  manufacturer: string;
  model: string;
  year: string;
}

export const BusManager: React.FC = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [formData, setFormData] = useState<BusFormData>({
    name: '',
    plateNumber: '',
    totalSeats: 40,
    busType: 'Standard',
    manufacturer: '',
    model: '',
    year: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    setIsLoading(true);
    try {
      const response = await adminAPI.getAllBuses();
      setBuses(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch buses:', err);
      setError(err.response?.data?.error || 'Failed to load buses');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      plateNumber: '',
      totalSeats: 40,
      busType: 'Standard',
      manufacturer: '',
      model: '',
      year: '',
    });
    setEditingBus(null);
    setError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      name: bus.name,
      plateNumber: bus.plate_number,
      totalSeats: bus.total_seats,
      busType: bus.bus_type,
      manufacturer: bus.manufacturer || '',
      model: bus.model || '',
      year: bus.year?.toString() || '',
    });
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    resetForm();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim() || !formData.plateNumber.trim()) {
      setError('Name and plate number are required');
      return;
    }

    if (formData.totalSeats <= 0) {
      setError('Total seats must be greater than 0');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        plateNumber: formData.plateNumber.trim(),
        totalSeats: formData.totalSeats,
        busType: formData.busType,
        manufacturer: formData.manufacturer.trim() || undefined,
        model: formData.model.trim() || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
      };

      if (editingBus) {
        await adminAPI.updateBus(editingBus.id, payload);
        setSuccess('Bus updated successfully');
      } else {
        await adminAPI.createBus(payload);
        setSuccess('Bus created successfully');
      }

      fetchBuses();
      setTimeout(() => {
        handleCloseDialog();
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to save bus:', err);
      setError(err.response?.data?.error || 'Failed to save bus');
    }
  };

  const handleDelete = async (busId: string, busName: string) => {
    if (!confirm(`Are you sure you want to delete "${busName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminAPI.deleteBus(busId);
      setSuccess('Bus deleted successfully');
      fetchBuses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to delete bus:', err);
      setError(err.response?.data?.error || 'Failed to delete bus');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="text-green-600" />;
      case 'maintenance':
        return <BuildIcon className="text-orange-600" />;
      case 'inactive':
        return <BlockIcon className="text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Container>
      <Section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DirectionsBusIcon className="text-blue-600" />
              Bus Fleet Management
            </h2>
            <p className="text-gray-600 mt-1">Manage your bus fleet and assign seat maps</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <AddIcon />
            Add New Bus
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {success}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading buses...</p>
          </div>
        ) : buses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <DirectionsBusIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: '48px' }} />
            <p className="text-gray-600">No buses found. Add your first bus to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buses.map((bus) => (
              <div
                key={bus.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <DirectionsBusIcon fontSize="small" />
                      {bus.name}
                    </h3>
                    <p className="text-sm text-gray-600 font-mono">{bus.plate_number}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${getStatusColor(
                      bus.status
                    )}`}
                  >
                    {getStatusIcon(bus.status)}
                    {bus.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-900">{bus.bus_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Seats:</span>
                    <span className="font-medium text-gray-900">{bus.total_seats}</span>
                  </div>
                  {bus.manufacturer && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Make:</span>
                      <span className="font-medium text-gray-900">{bus.manufacturer}</span>
                    </div>
                  )}
                  {bus.model && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Model:</span>
                      <span className="font-medium text-gray-900">{bus.model}</span>
                    </div>
                  )}
                  {bus.year && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Year:</span>
                      <span className="font-medium text-gray-900">{bus.year}</span>
                    </div>
                  )}
                </div>

                {/* Seat Map Assignment Status */}
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-center gap-2 text-sm">
                    <GridOnIcon fontSize="small" className="text-gray-600" />
                    <span className="text-gray-600">Seat Map:</span>
                  </div>
                  {bus.seat_map ? (
                    <div className="mt-1">
                      <p className="text-sm font-medium text-blue-600">{bus.seat_map.name}</p>
                      <p className="text-xs text-gray-500">{bus.seat_map.total_seats} seats configured</p>
                    </div>
                  ) : (
                    <p className="text-sm text-orange-600 mt-1">No seat map assigned</p>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleOpenEdit(bus)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    <EditIcon fontSize="small" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(bus.id, bus.name)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
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
        title={editingBus ? 'Edit Bus' : 'Add New Bus'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bus Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., VIP Express 01"
              required
            />
            <Input
              label="Plate Number"
              name="plateNumber"
              value={formData.plateNumber}
              onChange={handleInputChange}
              placeholder="e.g., 29B-12345"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bus Type
              </label>
              <select
                name="busType"
                value={formData.busType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Standard">Standard</option>
                <option value="VIP">VIP</option>
                <option value="Sleeper">Sleeper</option>
              </select>
            </div>
            <Input
              label="Total Seats"
              name="totalSeats"
              type="number"
              value={formData.totalSeats}
              onChange={handleInputChange}
              min="1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Manufacturer (Optional)"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleInputChange}
              placeholder="e.g., Hyundai"
            />
            <Input
              label="Model (Optional)"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              placeholder="e.g., Universe"
            />
          </div>

          <Input
            label="Year (Optional)"
            name="year"
            type="number"
            value={formData.year}
            onChange={handleInputChange}
            placeholder="e.g., 2023"
            min="1990"
            max={new Date().getFullYear() + 1}
          />

          {!editingBus && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
              <p className="font-medium mb-1">Next Steps:</p>
              <p>After creating the bus, go to the <strong>Seat Maps</strong> tab to assign a seat layout to this bus.</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseDialog}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingBus ? 'Update Bus' : 'Create Bus'}
            </button>
          </div>
        </form>
      </Dialog>
    </Container>
  );
};
