import { Bell, BellOff } from 'lucide-react';
import { useAlerts, useUpdateAlert } from '../hooks/useApi';
import toast from 'react-hot-toast';

const FREQ_OPTIONS = [
  { value: 3,  label: 'Every 3 months' },
  { value: 6,  label: 'Every 6 months' },
  { value: 12, label: 'Every 12 months' },
];

export default function AlertsPage() {
  const { data: alerts = [], isLoading } = useAlerts();
  const { mutateAsync: updateAlert } = useUpdateAlert();

  const handleToggle = async (vehicleId: string, enabled: boolean) => {
    try {
      await updateAlert({ vehicleId, enabled });
      toast.success(enabled ? 'Alerts enabled' : 'Alerts paused');
    } catch {
      toast.error('Failed to update alert');
    }
  };

  const handleFrequency = async (vehicleId: string, frequencyMonths: number) => {
    try {
      await updateAlert({ vehicleId, frequencyMonths });
      toast.success('Alert frequency updated');
    } catch {
      toast.error('Failed to update frequency');
    }
  };

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Rate alerts</h1>
      <p className="text-sm text-gray-500 mb-5">
        Get emailed automatically when better rates are available. We'll send you the top 3 quotes.
      </p>

      {alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Bell size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No alerts configured</p>
          <p className="text-xs text-gray-400 mt-1">Alerts are created automatically when you add a vehicle.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const vehicle = alert.vehicles as any;
            const nextDate = alert.next_alert_at
              ? new Date(alert.next_alert_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '—';
            const lastDate = alert.last_sent_at
              ? new Date(alert.last_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Never';

            return (
              <div key={alert.id} className={`bg-white rounded-xl border p-4 transition-opacity ${alert.enabled ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.enabled ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                      {alert.enabled ? <Bell size={18} /> : <BellOff size={18} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {vehicle?.year} {vehicle?.make} {vehicle?.model}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Next: {nextDate} · Last sent: {lastDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <select
                      value={alert.frequency_months}
                      onChange={e => handleFrequency(alert.vehicle_id, parseInt(e.target.value))}
                      disabled={!alert.enabled}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-400 disabled:opacity-50"
                    >
                      {FREQ_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(alert.vehicle_id, !alert.enabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${alert.enabled ? 'bg-brand-600' : 'bg-gray-200'}`}
                      aria-label={alert.enabled ? 'Disable alerts' : 'Enable alerts'}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${alert.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
        Alert emails include the top 3 lowest-priced quotes with provider name, annual premium, and a direct link to each provider's website. You can unsubscribe per vehicle at any time using the toggle above.
      </div>
    </div>
  );
}
