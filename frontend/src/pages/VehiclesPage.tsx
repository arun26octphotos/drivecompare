import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Car } from 'lucide-react';
import { useVehicles, useDeleteVehicle } from '../hooks/useApi';
import AddVehicleModal from '../components/AddVehicleModal';
import type { Vehicle } from '../types';
import toast from 'react-hot-toast';

const USE_LABELS: Record<string, string> = {
  daily_commute: 'Daily commute',
  pleasure:      'Pleasure / weekend',
  business:      'Business',
  farm:          'Farm / off-road',
};

export default function VehiclesPage() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const { mutateAsync: deleteVehicle } = useDeleteVehicle();
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const navigate = useNavigate();

  const handleDelete = async (vehicle: Vehicle) => {
    if (!confirm(`Remove ${vehicle.year} ${vehicle.make} ${vehicle.model}? Quote history is kept for 12 months.`)) return;
    try {
      await deleteVehicle(vehicle.id);
      toast.success('Vehicle removed');
    } catch {
      toast.error('Failed to remove vehicle');
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">My vehicles</h1>
        {vehicles.length < 5 && (
          <button
            onClick={() => { setEditVehicle(null); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors"
          >
            <Plus size={15} /> Add vehicle
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">Up to 5 vehicles per account.</p>

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Car size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600 mb-1">No vehicles yet</p>
          <p className="text-xs text-gray-400 mb-4">Add your first vehicle to start comparing insurance rates.</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors"
          >
            Add vehicle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                  <Car size={20} className="text-brand-600" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditVehicle(v); setShowModal(true); }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(v)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="font-medium text-sm mb-0.5">{v.year} {v.make} {v.model}</div>
              {v.trim && <div className="text-xs text-gray-500 mb-2">{v.trim}</div>}
              <div className="space-y-1 text-xs text-gray-400">
                {v.vin && <div>VIN: <span className="font-mono">{v.vin}</span></div>}
                {v.mileage && <div>{v.mileage.toLocaleString()} mi</div>}
                {v.primary_use && <div>{USE_LABELS[v.primary_use]}</div>}
              </div>
              <button
                onClick={() => navigate(`/quotes?vehicleId=${v.id}`)}
                className="mt-3 w-full text-brand-600 border border-brand-200 hover:bg-brand-50 rounded-lg py-1.5 text-xs font-medium transition-colors"
              >
                Get quotes →
              </button>
            </div>
          ))}

          {vehicles.length < 5 && (
            <button
              onClick={() => { setEditVehicle(null); setShowModal(true); }}
              className="bg-white rounded-xl border border-dashed border-gray-300 p-4 flex flex-col items-center justify-center gap-2 hover:border-brand-300 hover:bg-brand-50 transition-colors min-h-[160px]"
            >
              <Plus size={20} className="text-gray-400" />
              <span className="text-sm text-gray-500">Add vehicle</span>
            </button>
          )}
        </div>
      )}

      {showModal && (
        <AddVehicleModal
          vehicle={editVehicle}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
