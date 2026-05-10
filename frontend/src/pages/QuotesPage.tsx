import { Fragment, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVehicles, useRequestQuotes } from '../hooks/useApi';
import type { Quote } from '../types';
import toast from 'react-hot-toast';
import { RefreshCw, AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const COVERAGE_LABELS: Record<string, string> = {
  comprehensive: 'Comprehensive',
  collision: 'Collision',
  liability: 'Liability only',
};

const COVERAGE_COLORS: Record<string, string> = {
  comprehensive: 'bg-green-50 text-green-700',
  collision:     'bg-teal-50 text-teal-700',
  liability:     'bg-amber-50 text-amber-700',
};

export default function QuotesPage() {
  const [searchParams] = useSearchParams();
  const [selectedVehicleId, setSelectedVehicleId] = useState(searchParams.get('vehicleId') || '');
  const [filterCoverage, setFilterCoverage] = useState('all');
  const [sortBy, setSortBy] = useState<'annualPremium' | 'monthlyPremium' | 'providerName'>('annualPremium');
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [results, setResults] = useState<{ quotes: Quote[]; unavailableProviders: string[] } | null>(null);

  const { data: vehicles = [] } = useVehicles();
  const { mutateAsync: requestQuotes, isPending } = useRequestQuotes();

  const handleGetQuotes = async () => {
    if (!selectedVehicleId) { toast.error('Select a vehicle first'); return; }
    try {
      const data = await requestQuotes(selectedVehicleId);
      setResults({ quotes: data.quotes, unavailableProviders: data.unavailableProviders });
      setExpandedProvider(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch quotes');
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const filteredQuotes = (results?.quotes || [])
    .filter(q => filterCoverage === 'all' || q.coverageType === filterCoverage)
    .sort((a, b) =>
      sortBy === 'providerName'
        ? a.providerName.localeCompare(b.providerName)
        : a[sortBy] - b[sortBy]
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Get quotes</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">Compare rates from multiple providers at once.</p>

      {/* Vehicle selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Select vehicle</label>
          <select
            value={selectedVehicleId}
            onChange={(e) => { setSelectedVehicleId(e.target.value); setResults(null); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          >
            <option value="">— Choose a vehicle —</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGetQuotes}
          disabled={isPending || !selectedVehicleId}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
          {isPending ? 'Fetching quotes…' : 'Get quotes'}
        </button>
      </div>

      {/* Loading state */}
      {isPending && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Querying all providers concurrently…</p>
          <p className="text-xs text-gray-400 mt-1">This takes up to 15 seconds</p>
        </div>
      )}

      {/* Results */}
      {results && !isPending && (
        <div>
          {/* Unavailable providers notice */}
          {results.unavailableProviders.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                {results.unavailableProviders.join(', ')} did not respond in time and{' '}
                {results.unavailableProviders.length === 1 ? 'was' : 'were'} excluded.
              </span>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {['all', 'comprehensive', 'collision', 'liability'].map(f => (
              <button
                key={f}
                onClick={() => setFilterCoverage(f)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  filterCoverage === f
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {f === 'all' ? 'All coverage' : COVERAGE_LABELS[f]}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
              Sort:
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none"
              >
                <option value="annualPremium">Annual premium</option>
                <option value="monthlyPremium">Monthly premium</option>
                <option value="providerName">Provider name</option>
              </select>
            </div>
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
              No quotes match the selected filter.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Provider</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Coverage</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Annual</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Monthly</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Deductible</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((q, i) => {
                    const isBest = i === 0 && sortBy !== 'providerName';
                    const isExpanded = expandedProvider === q.providerId;
                    return (
                      <Fragment key={q.providerId}>
                        <tr
                          className={`border-b border-gray-100 cursor-pointer transition-colors ${
                            isBest ? 'bg-brand-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setExpandedProvider(isExpanded ? null : q.providerId)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium">{q.providerName}</span>
                            {isBest && (
                              <span className="ml-2 bg-brand-600 text-white text-xs px-2 py-0.5 rounded-full">
                                Best
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${COVERAGE_COLORS[q.coverageType]}`}>
                              {COVERAGE_LABELS[q.coverageType]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${q.annualPremium.toLocaleString()}/yr
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            ${q.monthlyPremium}/mo
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {q.deductible === 0 ? '—' : `$${q.deductible}`}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400 ml-auto" /> : <ChevronDown size={16} className="text-gray-400 ml-auto" />}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                {Object.entries(q.coverageDetails).map(([k, v]) => (
                                  <div key={k}>
                                    <div className="text-xs text-gray-500 mb-0.5 capitalize">
                                      {k.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                    </div>
                                    <div className="text-sm font-medium">{v}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="mb-3">
                                <div className="text-xs text-gray-500 mb-1">Exclusions</div>
                                <div className="flex flex-wrap gap-2">
                                  {q.exclusions.map(e => (
                                    <span key={e} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">
                                      {e}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <a
                                href={q.providerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-800 transition-colors"
                              >
                                <ExternalLink size={12} />
                                Go to {q.providerName}
                              </a>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
