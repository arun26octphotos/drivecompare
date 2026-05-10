import { useNavigate } from 'react-router-dom';
import { Car, Search, Bell, TrendingDown } from 'lucide-react';
import { useVehicles, useQuoteHistory, useAlerts } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: vehicles = [] } = useVehicles();
  const { data: history = [] } = useQuoteHistory();
  const { data: alerts = [] } = useAlerts();
  const navigate = useNavigate();

  const firstName = user?.name?.split(' ')[0] || 'there';
  const activeAlerts = alerts.filter(a => a.enabled).length;
  const lastQuote = history[0];
  const bestEver = history.length > 0
    ? Math.min(...history.flatMap(h => h.quotes.map(q => q.annualPremium)))
    : null;

  const QUICK_ACTIONS = [
    {
      icon: Car,
      label: 'Add a vehicle',
      desc: `${vehicles.length} of 5 saved`,
      color: 'text-brand-600 bg-brand-50',
      onClick: () => navigate('/vehicles'),
    },
    {
      icon: Search,
      label: 'Get quotes',
      desc: vehicles.length > 0 ? `${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''} ready` : 'Add a vehicle first',
      color: 'text-teal-600 bg-teal-50',
      onClick: () => navigate('/quotes'),
    },
    {
      icon: Bell,
      label: 'Rate alerts',
      desc: `${activeAlerts} active alert${activeAlerts !== 1 ? 's' : ''}`,
      color: 'text-amber-600 bg-amber-50',
      onClick: () => navigate('/alerts'),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-0.5">Welcome back, {firstName}</h1>
      <p className="text-sm text-gray-500 mb-6">Here's a snapshot of your insurance comparison activity.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Vehicles saved',  value: vehicles.length },
          { label: 'Quote requests',  value: history.length },
          { label: 'Active alerts',   value: activeAlerts },
          { label: 'Best rate found', value: bestEver ? `$${bestEver.toLocaleString()}/yr` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-medium text-gray-600 mb-3">Quick actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {QUICK_ACTIONS.map(({ icon: Icon, label, desc, color, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Recent quotes */}
      {history.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-gray-600 mb-3">Recent quote requests</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {history.slice(0, 5).map((h, i) => {
              const best = h.quotes[0];
              return (
                <div
                  key={h.id}
                  onClick={() => navigate('/history')}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div>
                    <div className="text-sm font-medium">
                      {(h.vehicles as any)?.year} {(h.vehicles as any)?.make} {(h.vehicles as any)?.model}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{h.quotes.length} provider{h.quotes.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {best && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-700 flex items-center gap-1">
                        <TrendingDown size={13} /> ${best.annualPremium.toLocaleString()}/yr
                      </div>
                      <div className="text-xs text-gray-400">best rate</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {vehicles.length === 0 && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 text-center mt-4">
          <Car size={28} className="mx-auto text-brand-300 mb-2" />
          <p className="text-sm font-medium text-brand-800 mb-1">Add your first vehicle to get started</p>
          <p className="text-xs text-brand-600 mb-3">Enter a VIN and we'll auto-fill the details, then compare rates from 5+ providers.</p>
          <button
            onClick={() => navigate('/vehicles')}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors"
          >
            Add vehicle →
          </button>
        </div>
      )}
    </div>
  );
}
