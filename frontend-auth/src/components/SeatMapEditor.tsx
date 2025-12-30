import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Save,
  RefreshCw,
  Plus,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { seatMapAPI } from '../lib/api';
import type {
  SeatMap,
  Seat,
  SeatType,
  SeatTypeConfig,
  CreateSeatMapInput,
  SeatUpdateItem,
} from '../types/seatMap';
import { DEFAULT_SEAT_TYPE_CONFIGS, getSeatTypeConfig } from '../types/seatMap';

interface SeatMapEditorProps {
  seatMapId?: string;
  onBack: () => void;
  onSave?: (seatMap: SeatMap) => void;
}

interface SeatCellProps {
  seat: Seat;
  isSelected: boolean;
  onSelect: (seat: Seat) => void;
}

const SeatCell: React.FC<SeatCellProps> = ({
  seat,
  isSelected,
  onSelect,
}) => {
  const config = getSeatTypeConfig(seat.seat_type);

  return (
    <button
      onClick={() => onSelect(seat)}
      className={`
        w-12 h-12 rounded-lg flex items-center justify-center text-xs font-medium
        transition-all duration-200 border-2
        ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
        ${seat.seat_type === 'aisle' ? 'cursor-default' : 'cursor-pointer hover:scale-105'}
      `}
      style={{
        backgroundColor: config.color,
        borderColor: isSelected ? '#3B82F6' : 'transparent',
        color: seat.seat_type === 'aisle' ? '#9CA3AF' : '#FFFFFF',
      }}
      title={`${seat.seat_number} - ${config.name} (${seat.price_multiplier}x)`}
    >
      {seat.seat_type !== 'aisle' && seat.seat_number}
    </button>
  );
};

export const SeatMapEditor: React.FC<SeatMapEditorProps> = ({
  seatMapId,
  onBack,
  onSave,
}) => {
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [selectedSeatType, setSelectedSeatType] = useState<SeatType>('standard');
  const [pendingChanges, setPendingChanges] = useState<Map<string, SeatUpdateItem>>(new Map());
  const [seatTypeConfigs, setSeatTypeConfigs] = useState<SeatTypeConfig[]>(DEFAULT_SEAT_TYPE_CONFIGS);
  
  // Form state for new seat map
  const [showCreateForm, setShowCreateForm] = useState(!seatMapId);
  const [newSeatMapForm, setNewSeatMapForm] = useState<CreateSeatMapInput>({
    name: '',
    description: '',
    rows: 10,
    columns: 4,
    bus_type: 'Standard',
  });

  // Load seat map data
  const loadSeatMap = useCallback(async () => {
    if (!seatMapId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await seatMapAPI.getById(seatMapId);
      setSeatMap(response.data.data);
      setShowCreateForm(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load seat map';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [seatMapId]);

  // Load seat type configs
  const loadConfigs = useCallback(async () => {
    try {
      const response = await seatMapAPI.getConfigs();
      if (response.data.data) {
        setSeatTypeConfigs(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load seat type configs:', err);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
    if (seatMapId) {
      loadSeatMap();
    }
  }, [seatMapId, loadSeatMap, loadConfigs]);

  // Handle seat selection
  const handleSeatSelect = (seat: Seat) => {
    if (seat.seat_type === 'aisle') return;

    const newSelected = new Set(selectedSeats);
    if (newSelected.has(seat.id)) {
      newSelected.delete(seat.id);
    } else {
      newSelected.add(seat.id);
    }
    setSelectedSeats(newSelected);
  };

  // Apply seat type to selected seats
  const applyTypeToSelected = () => {
    if (selectedSeats.size === 0 || !seatMap?.seats) return;

    const newChanges = new Map(pendingChanges);
    const config = seatTypeConfigs.find(c => c.type === selectedSeatType);
    
    selectedSeats.forEach(seatId => {
      newChanges.set(seatId, {
        id: seatId,
        seat_type: selectedSeatType,
        price_multiplier: config?.price_multiplier || 1.0,
        is_bookable: config?.is_bookable ?? true,
      });
    });

    setPendingChanges(newChanges);

    // Update local state for immediate UI feedback
    const updatedSeats = seatMap.seats.map(seat => {
      if (selectedSeats.has(seat.id)) {
        return {
          ...seat,
          seat_type: selectedSeatType,
          price_multiplier: config?.price_multiplier || 1.0,
          is_bookable: config?.is_bookable ?? true,
        };
      }
      return seat;
    });

    setSeatMap({ ...seatMap, seats: updatedSeats });
    setSelectedSeats(new Set());
  };

  // Save changes
  const saveChanges = async () => {
    if (!seatMap || pendingChanges.size === 0) return;

    setSaving(true);
    setError(null);

    try {
      const updates: SeatUpdateItem[] = Array.from(pendingChanges.values());
      const response = await seatMapAPI.bulkUpdateSeats(seatMap.id, { seats: updates });
      setSeatMap(response.data.data);
      setPendingChanges(new Map());
      toast.success('Seat map updated successfully');
      onSave?.(response.data.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to save changes';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Create new seat map
  const createSeatMap = async () => {
    if (!newSeatMapForm.name) {
      toast.error('Name is required');
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await seatMapAPI.create(newSeatMapForm);
      setSeatMap(response.data.data);
      setShowCreateForm(false);
      toast.success('Seat map created successfully');
      onSave?.(response.data.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create seat map';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Regenerate layout
  const regenerateLayout = async () => {
    if (!seatMap) return;

    const confirmed = window.confirm(
      'This will delete all existing seats and create a new layout. Continue?'
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await seatMapAPI.regenerateLayout(seatMap.id, {
        rows: seatMap.rows,
        columns: seatMap.columns,
      });
      setSeatMap(response.data.data);
      setPendingChanges(new Map());
      setSelectedSeats(new Set());
      toast.success('Layout regenerated successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to regenerate layout';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Select all seats
  const selectAll = () => {
    if (!seatMap?.seats) return;
    const allIds = new Set(
      seatMap.seats
        .filter(s => s.seat_type !== 'aisle')
        .map(s => s.id)
    );
    setSelectedSeats(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSeats(new Set());
  };

  // Render seat grid
  const renderSeatGrid = () => {
    if (!seatMap?.seats) return null;

    const rows: Seat[][] = [];
    for (let r = 1; r <= seatMap.rows; r++) {
      const rowSeats = seatMap.seats
        .filter(s => s.row === r)
        .sort((a, b) => a.column - b.column);
      rows.push(rowSeats);
    }

    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 overflow-x-auto">
        {/* Bus front indicator */}
        <div className="flex justify-center mb-4">
          <div className="bg-gray-300 dark:bg-gray-600 rounded-t-full px-8 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            FRONT
          </div>
        </div>

        {/* Seat grid */}
        <div className="flex flex-col items-center gap-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2">
              {/* Row number */}
              <div className="w-8 h-12 flex items-center justify-center text-gray-500 font-medium">
                {rowIndex + 1}
              </div>

              {/* Seats */}
              {row.map((seat, colIndex) => (
                <React.Fragment key={seat.id}>
                  <SeatCell
                    seat={seat}
                    isSelected={selectedSeats.has(seat.id)}
                    onSelect={handleSeatSelect}
                  />
                  {/* Add aisle gap in the middle for 4-column layout */}
                  {seatMap.columns === 4 && colIndex === 1 && (
                    <div className="w-4" />
                  )}
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>

        {/* Bus back indicator */}
        <div className="flex justify-center mt-4">
          <div className="bg-gray-300 dark:bg-gray-600 rounded-b-full px-8 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            BACK
          </div>
        </div>
      </div>
    );
  };

  // Create form
  if (showCreateForm) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Create New Seat Map
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={newSeatMapForm.name}
              onChange={e => setNewSeatMapForm({ ...newSeatMapForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., Standard 40-Seater"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={newSeatMapForm.description || ''}
              onChange={e => setNewSeatMapForm({ ...newSeatMapForm, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rows *
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={newSeatMapForm.rows}
                onChange={e => setNewSeatMapForm({ ...newSeatMapForm, rows: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Columns *
              </label>
              <input
                type="number"
                min={2}
                max={6}
                value={newSeatMapForm.columns}
                onChange={e => setNewSeatMapForm({ ...newSeatMapForm, columns: parseInt(e.target.value) || 2 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bus Type *
            </label>
            <select
              value={newSeatMapForm.bus_type}
              onChange={e => setNewSeatMapForm({ ...newSeatMapForm, bus_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="Standard">Standard</option>
              <option value="VIP">VIP</option>
              <option value="Sleeper">Sleeper</option>
            </select>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Seats: <strong>{newSeatMapForm.rows * newSeatMapForm.columns}</strong>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={createSeatMap}
              disabled={saving || !newSeatMapForm.name}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Seat Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Grid className="h-5 w-5 text-blue-600" />
              {seatMap?.name || 'Seat Map Editor'}
            </h2>
            {seatMap && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {seatMap.rows} rows × {seatMap.columns} columns | {seatMap.total_seats} seats | {seatMap.bus_type}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingChanges.size > 0 && (
            <span className="text-sm text-orange-600 dark:text-orange-400 mr-2">
              {pendingChanges.size} unsaved changes
            </span>
          )}
          <button
            onClick={regenerateLayout}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Regenerate layout"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={saveChanges}
            disabled={saving || pendingChanges.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Seat type selector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Seat Types
            </h3>
            <div className="space-y-2">
              {seatTypeConfigs.map(config => (
                <button
                  key={config.type}
                  onClick={() => setSelectedSeatType(config.type)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedSeatType === config.type
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-white dark:bg-gray-700 border-2 border-transparent hover:border-gray-300'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: config.color }}
                  />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {config.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {config.price_multiplier}x price
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selection controls */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Selection ({selectedSeats.size})
            </h3>
            <div className="space-y-2">
              <button
                onClick={selectAll}
                className="w-full px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="w-full px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg"
              >
                Clear Selection
              </button>
              <button
                onClick={applyTypeToSelected}
                disabled={selectedSeats.size === 0}
                className="w-full px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                Apply Selected Type
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Instructions
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Click seats to select them</li>
              <li>• Choose a seat type from above</li>
              <li>• Click &quot;Apply Selected Type&quot;</li>
              <li>• Don&apos;t forget to save!</li>
            </ul>
          </div>
        </div>

        {/* Seat grid */}
        <div className="lg:col-span-3">
          {renderSeatGrid()}
        </div>
      </div>
    </div>
  );
};

export default SeatMapEditor;
