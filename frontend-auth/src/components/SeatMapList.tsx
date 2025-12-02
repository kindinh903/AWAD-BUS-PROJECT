import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Bus,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react';
import { seatMapAPI, adminAPI } from '../lib/api';
import type { SeatMap } from '../types/seatMap';

interface Bus {
  id: string;
  name: string;
  plate_number: string;
  seat_map_id?: string;
  total_seats: number;
  bus_type: string;
  status: string;
}

interface SeatMapListProps {
  onEdit: (seatMapId: string) => void;
  onCreateNew: () => void;
}

export const SeatMapList: React.FC<SeatMapListProps> = ({ onEdit, onCreateNew }) => {
  const [seatMaps, setSeatMaps] = useState<SeatMap[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [assigningBus, setAssigningBus] = useState<string | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSeatMapForAssign, setSelectedSeatMapForAssign] = useState<string | null>(null);

  // Load seat maps and buses
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [seatMapsRes, busesRes] = await Promise.all([
        seatMapAPI.getAll(),
        adminAPI.getAllBuses(),
      ]);

      setSeatMaps(seatMapsRes.data.data || []);
      setBuses(busesRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Delete seat map
  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await seatMapAPI.delete(id);
      setSeatMaps(seatMaps.filter(sm => sm.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete seat map');
    }
  };

  // Assign seat map to bus
  const handleAssign = async () => {
    if (!selectedSeatMapForAssign || !selectedBusId) return;

    setAssigningBus(selectedBusId);

    try {
      await seatMapAPI.assignToBus({
        bus_id: selectedBusId,
        seat_map_id: selectedSeatMapForAssign,
      });
      await loadData();
      setShowAssignModal(false);
      setSelectedSeatMapForAssign(null);
      setSelectedBusId('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign seat map to bus');
    } finally {
      setAssigningBus(null);
    }
  };

  // Open assign modal
  const openAssignModal = (seatMapId: string) => {
    setSelectedSeatMapForAssign(seatMapId);
    setShowAssignModal(true);
  };

  // Filter seat maps
  const filteredSeatMaps = seatMaps.filter(
    sm =>
      sm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sm.bus_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get buses using a specific seat map
  const getBusesUsingSeatMap = (seatMapId: string): Bus[] => {
    return buses.filter(b => b.seat_map_id === seatMapId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Grid className="h-6 w-6 text-blue-600" />
          Seat Map Templates
        </h2>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search seat maps..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button
            onClick={loadData}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Seat Map
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Seat maps grid */}
      {filteredSeatMaps.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <Grid className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No seat maps found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first seat map to get started'}
          </p>
          {!searchTerm && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Seat Map
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSeatMaps.map(seatMap => {
            const assignedBuses = getBusesUsingSeatMap(seatMap.id);

            return (
              <div
                key={seatMap.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                {/* Card header with bus type color */}
                <div
                  className={`h-2 ${
                    seatMap.bus_type === 'VIP'
                      ? 'bg-amber-500'
                      : seatMap.bus_type === 'Sleeper'
                      ? 'bg-purple-500'
                      : 'bg-blue-500'
                  }`}
                />

                <div className="p-5">
                  {/* Title and status */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {seatMap.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          seatMap.bus_type === 'VIP'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : seatMap.bus_type === 'Sleeper'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {seatMap.bus_type}
                      </span>
                    </div>
                    {seatMap.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>

                  {/* Description */}
                  {seatMap.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                      {seatMap.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {seatMap.rows}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Rows
                      </div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {seatMap.columns}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Columns
                      </div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {seatMap.total_seats}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Seats
                      </div>
                    </div>
                  </div>

                  {/* Assigned buses */}
                  {assignedBuses.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Used by {assignedBuses.length} bus(es):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {assignedBuses.slice(0, 3).map(bus => (
                          <span
                            key={bus.id}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full"
                          >
                            <Bus className="h-3 w-3" />
                            {bus.name}
                          </span>
                        ))}
                        {assignedBuses.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{assignedBuses.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => openAssignModal(seatMap.id)}
                      className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Bus className="h-4 w-4" />
                      Assign to Bus
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(seatMap.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(seatMap.id, seatMap.name)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Assign Seat Map to Bus
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select a Bus
              </label>
              <select
                value={selectedBusId}
                onChange={e => setSelectedBusId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose a bus...</option>
                {buses
                  .filter(b => b.status === 'active')
                  .map(bus => (
                    <option key={bus.id} value={bus.id}>
                      {bus.name} ({bus.plate_number}) - {bus.bus_type}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedSeatMapForAssign(null);
                  setSelectedBusId('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedBusId || assigningBus !== null}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {assigningBus ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Bus className="h-4 w-4" />
                )}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatMapList;
