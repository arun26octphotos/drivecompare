import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useQuoteHistory } from '../hooks/useApi';

const COVERAGE_COLORS: Record<string, string> = {
  comprehensive: 'bg-green-50 text-green-700',
  collision:     'bg-teal-50 text-teal-700',
  liability:     'bg-amber-50 text-amber-700',
};

export default function HistoryPage() {
  const { data: history = [], isLoading } = useQuoteHistory();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Quote history</h1>
      <p className="text-sm text-gray-500 mb-5">All quote requests from the past 12 months.</p>

      {history.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Clock size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No quote history yet</p>
          <p className="text-xs text-gray-400 mt-1">Your past quote requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(h => {
            const vehicle = h.vehicles as any;
            const best = h.quotes[0];
            const isOpen = expanded === h.id;

            return (
              <div key={h.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : h.id)}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {vehicle?.year} {vehicle?.make} {vehicle?.model}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.created_at).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      })}
                      {' · '}{h.quotes.length} provider{h.quotes.length !== 1 ? 's' : ''}
                      {h.unavailable_providers.length > 0 && (
                        <span className="text-amber-500"> · {h.unavailable_providers.length} unavailable</span>
                      )}
                    </div>
                  </div>
                  {best && (
                    <div className="text-right mr-3">
                      <div className="text-sm font-medium text-green-700">${best.annualPremium.toLocaleString()}/yr</div>
                      <div className="text-xs text-gray-400">best rate</div>
                    </div>
                  )}
                  {isOpen ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Provider</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Coverage</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Annual</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Monthly</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {h.quotes.map((q, i) => (
                          <tr key={q.providerId} className={`border-t border-gray-100 ${i === 0 ? 'bg-green-50/50' : ''}`}>
                            <td className="px-4 py-2.5">
                              <span className="font-medium">{q.providerName}</span>
                              {i === 0 && <span className="ml-2 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">Best</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${COVERAGE_COLORS[q.coverageType]}`}>
                                {q.coverageType}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium">${q.annualPremium.toLocaleString()}/yr</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">${q.monthlyPremium}/mo</td>
                            <td className="px-4 py-2.5 text-right">
                              <a href={q.providerUrl} target="_blank" rel="noopener noreferrer"
                                className="text-brand-600 hover:text-brand-800 transition-colors">
                                <ExternalLink size={13} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
