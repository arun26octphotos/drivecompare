import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAddVehicle, useUpdateVehicle } from '../hooks/useApi';
import { api } from '../lib/api';
import type { Vehicle } from '../types';
import toast from 'react-hot-toast';

interface Props {
  vehicle: Vehicle | null;
  onClose: () => void;
}

const STEPS = ['Enter VIN', 'Details', 'Confirm'];

const PRIMARY_USE_OPTIONS = [
  { value: 'daily_commute', label: 'Daily commute' },
  { value: 'pleasure',      label: 'Pleasure / weekend' },
  { value: 'business',      label: 'Business' },
  { value: 'farm',          label: 'Farm / off-road' },
];

export default function AddVehicleModal({ vehicle, onClose }: Props) {
  const isEdit = !!vehicle;
  const [step, setStep] = useState(isEdit ? 1 : 0);

  // VIN step state
  const [vin, setVin] = useState(vehicle?.vin || '');
  const [vinStatus, setVinStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [vinError, setVinError] = useState('');

  // Details state
  const [make, setMake]         = useState(vehicle?.make || '');
  const [model, setModel]       = useState(vehicle?.model || '');
  const [year, setYear]         = useState<number>(vehicle?.year || new Date().getFullYear());
  const [trim, setTrim]         = useState(vehicle?.trim || '');
  const [mileage, setMileage]   = useState<string>(vehicle?.mileage?.toString() || '');
  const [primaryUse, setPrimaryUse] = useState(vehicle?.primary_use || '');
  const [manualEntry, setManualEntry] = useState(isEdit);

  const { mutateAsync: addVehicle, isPending: adding } = useAddVehicle();
  const { mutateAsync: updateVehicle, isPending: updating } = useUpdateVehicle();
  const saving = adding || updating;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear + 1 - i);

  const vinClean = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase().slice(0, 17);

  async function decodeVin() {
    if (vinClean.length !== 17) return;
    setVinStatus('loading');
    setVinError('');
    try {
      const { data } = await api.get(`/api/vehicles/decode-vin/${vinClean}`);
      setMake(data.make);
      setModel(data.model);
      setYear(data.year);
      setTrim(data.trim || '');
      setVinStatus('ok');
      setManualEntry(false);
      setStep(1);
    } catch (err: any) {
      setVinStatus('error');
      setVinError(err.response?.data?.error || 'VIN not recognised — enter details manually');
      setManualEntry(true);
    }
  }

  async function handleSave() {
    const payload: Partial<Vehicle> = {
      vin: vinClean || undefined,
      make, model, year,
      trim: trim || undefined,
      mileage: mileage ? parseInt(mileage) : undefined,
      primary_use: primaryUse as Vehicle['primary_use'] || undefined,
    };

    try {
      if (isEdit) {
        await updateVehicle({ id: vehicle!.id, ...payload });
        toast.success('Vehicle updated');
      } else {
        await addVehicle(payload);
        toast.success('Vehicle added');
      }
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save vehicle');
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const detailsComplete = make && model && year;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-base">{isEdit ? 'Edit vehicle' : 'Add vehicle'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        {!isEdit && (
          <div className="flex items-center gap-0 px-6 pt-4 pb-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-0">
                <div className={`flex items-center gap-1.5 text-xs ${i < step ? 'text-green-600' : i === step ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${i < step ? 'bg-green-100 text-green-600' : i === step ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                    {i < step ? '✓' : i + 1}
                  </span>
                  {s}
                </div>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-200 mx-2" />}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5">

          {/* Step 0: VIN */}
          {step === 0 && !isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Vehicle identification number (VIN)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vinClean}
                  onChange={e => { setVin(e.target.value); setVinStatus('idle'); }}
                  maxLength={17}
                  placeholder="17-character VIN"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono tracking-wide focus:outline-none focus:border-brand-400 uppercase"
                />
                <button
                  onClick={decodeVin}
                  disabled={vinClean.length !== 17 || vinStatus === 'loading'}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-800 transition-colors"
                >
                  {vinStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : null}
                  Decode
                </button>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-gray-400">{vinClean.length} / 17</span>
                {vinStatus === 'ok' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> Decoded!</span>}
                {vinStatus === 'error' && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {vinError}</span>}
              </div>

              {vinStatus !== 'ok' && (
                <button
                  onClick={() => { setManualEntry(true); setStep(1); }}
                  className="mt-3 text-xs text-brand-600 hover:underline"
                >
                  Enter details manually instead →
                </button>
              )}
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-3">
              {!isEdit && !manualEntry && make && (
                <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 text-sm">
                  <div className="font-medium text-brand-800">{year} {make} {model} {trim}</div>
                  <div className="text-xs text-brand-600 font-mono mt-0.5">{vinClean}</div>
                  <button onClick={() => setManualEntry(true)} className="text-xs text-brand-600 hover:underline mt-1 block">Edit details</button>
                </div>
              )}

              {(manualEntry || isEdit) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Make *</label>
                    <input value={make} onChange={e => setMake(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" placeholder="Toyota" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Model *</label>
                    <input value={model} onChange={e => setModel(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" placeholder="Camry" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Year *</label>
                    <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Trim</label>
                    <input value={trim} onChange={e => setTrim(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" placeholder="LE, XSE…" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mileage</label>
                  <input type="number" value={mileage} onChange={e => setMileage(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" placeholder="32,000" min={0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Primary use</label>
                  <select value={primaryUse} onChange={e => setPrimaryUse(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400">
                    <option value="">Select…</option>
                    {PRIMARY_USE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && !isEdit && (
            <div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 mb-3">
                {[
                  ['Vehicle', `${year} ${make} ${model}${trim ? ' ' + trim : ''}`],
                  ...(vinClean ? [['VIN', vinClean]] : []),
                  ...(mileage ? [['Mileage', parseInt(mileage).toLocaleString() + ' mi']] : []),
                  ...(primaryUse ? [['Primary use', PRIMARY_USE_OPTIONS.find(o => o.value === primaryUse)?.label || primaryUse]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className={`font-medium ${k === 'VIN' ? 'font-mono text-xs' : ''}`}>{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Rate alerts will be scheduled every 6 months. You can adjust this in the Alerts tab.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          {isEdit ? (
            <button
              onClick={handleSave}
              disabled={!detailsComplete || saving}
              className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-800 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Save changes
            </button>
          ) : step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !detailsComplete}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-800 transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-800 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Save vehicle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
