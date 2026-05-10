export interface Vehicle {
  id: string;
  user_id: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  mileage?: number;
  primary_use?: 'daily_commute' | 'pleasure' | 'business' | 'farm';
  created_at: string;
  updated_at?: string;
}

export interface Quote {
  providerId: string;
  providerName: string;
  coverageType: 'comprehensive' | 'collision' | 'liability';
  annualPremium: number;
  monthlyPremium: number;
  deductible: number;
  providerUrl: string;
  coverageDetails: {
    bodilyInjuryLiability: string;
    propertyDamage: string;
    uninsuredMotorist: string;
    comprehensiveDeductible: string;
  };
  exclusions: string[];
  retrievedAt: string;
}

export interface QuoteRequest {
  id: string;
  vehicle_id: string;
  quotes: Quote[];
  unavailable_providers: string[];
  created_at: string;
  vehicles?: Pick<Vehicle, 'make' | 'model' | 'year' | 'vin'>;
}

export interface AlertConfig {
  id: string;
  vehicle_id: string;
  user_id: string;
  enabled: boolean;
  frequency_months: 3 | 6 | 12;
  next_alert_at: string;
  last_sent_at?: string;
  vehicles?: Pick<Vehicle, 'make' | 'model' | 'year'>;
}
