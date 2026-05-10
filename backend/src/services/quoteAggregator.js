const axios = require('axios');

// Registry of insurance providers.
// Each provider implements: { id, name, fetchQuote(vehicle, user) => Quote | null }
// Add real provider integrations here as you onboard them.

const PROVIDERS = [
  {
    id: 'nationwide',
    name: 'NationWide',
    async fetchQuote(vehicle, user) {
      // TODO: replace with real API call
      return mockQuote(this.id, this.name, vehicle, { baseRate: 1100 });
    },
  },
  {
    id: 'libertyshield',
    name: 'LibertyShield',
    async fetchQuote(vehicle, user) {
      return mockQuote(this.id, this.name, vehicle, { baseRate: 1200 });
    },
  },
  {
    id: 'statefarm',
    name: 'StateFarm',
    async fetchQuote(vehicle, user) {
      return mockQuote(this.id, this.name, vehicle, { baseRate: 980, coverageType: 'collision' });
    },
  },
  {
    id: 'allclear',
    name: 'AllClear',
    async fetchQuote(vehicle, user) {
      return mockQuote(this.id, this.name, vehicle, { baseRate: 750, coverageType: 'liability' });
    },
  },
  {
    id: 'premiumguard',
    name: 'PremiumGuard',
    async fetchQuote(vehicle, user) {
      return mockQuote(this.id, this.name, vehicle, { baseRate: 1380 });
    },
  },
];

const PROVIDER_TIMEOUT_MS = 10000; // 10s per requirements

/**
 * Fetch quotes from all providers concurrently.
 * Returns { quotes: Quote[], unavailableProviders: string[] }
 */
async function aggregateQuotes(vehicle, user) {
  const results = await Promise.allSettled(
    PROVIDERS.map((provider) =>
      Promise.race([
        provider.fetchQuote(vehicle, user).then((q) => ({ provider, quote: q })),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${provider.name} timed out`)), PROVIDER_TIMEOUT_MS)
        ),
      ])
    )
  );

  const quotes = [];
  const unavailableProviders = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.quote) {
      quotes.push(result.value.quote);
    } else {
      const reason = result.reason?.message || 'Unknown error';
      console.error(`[QuoteAggregator] Provider ${PROVIDERS[i].name} failed:`, reason);
      unavailableProviders.push(PROVIDERS[i].name);
    }
  });

  // Sort by annual premium ascending
  quotes.sort((a, b) => a.annualPremium - b.annualPremium);
  return { quotes, unavailableProviders };
}

// ─── Mock quote generator ────────────────────────────────────────────────────
// Produces realistic-looking quotes based on vehicle age and mileage.
// Replace each provider's fetchQuote with real HTTP calls as you integrate.

const COVERAGE_TYPES = ['comprehensive', 'collision', 'liability'];

function mockQuote(providerId, providerName, vehicle, opts = {}) {
  const { baseRate = 1000, coverageType = 'comprehensive' } = opts;
  const age = new Date().getFullYear() - (vehicle.year || 2020);
  const mileageFactor = vehicle.mileage ? Math.min(vehicle.mileage / 100000, 1) * 0.2 : 0;
  const ageFactor = Math.min(age * 0.02, 0.3);
  const jitter = (Math.random() - 0.5) * 0.1; // ±5% random variation

  const annualPremium = Math.round(baseRate * (1 + ageFactor + mileageFactor + jitter));
  const monthlyPremium = Math.round(annualPremium / 12);
  const deductible = coverageType === 'liability' ? 0 : [500, 750, 1000][Math.floor(Math.random() * 3)];

  return {
    providerId,
    providerName,
    coverageType,
    annualPremium,
    monthlyPremium,
    deductible,
    providerUrl: `https://www.${providerId}.com/quote`,
    coverageDetails: {
      bodilyInjuryLiability: '$100K/$300K',
      propertyDamage: '$100,000',
      uninsuredMotorist: '$50K/$100K',
      comprehensiveDeductible: coverageType !== 'liability' ? `$${deductible}` : 'N/A',
    },
    exclusions: [
      'Racing or track use',
      'Commercial delivery use',
      'Intentional damage',
    ],
    retrievedAt: new Date().toISOString(),
  };
}

module.exports = { aggregateQuotes, PROVIDERS };
