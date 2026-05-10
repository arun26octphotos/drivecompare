import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Vehicle, QuoteRequest, AlertConfig } from '../types';

// ─── Vehicles ──────────────────────────────────────────────────────────────

export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data } = await api.get('/api/vehicles');
      return data.vehicles;
    },
  });
}

export function useDecodeVin(vin: string) {
  return useQuery({
    queryKey: ['decode-vin', vin],
    queryFn: async () => {
      const { data } = await api.get(`/api/vehicles/decode-vin/${vin}`);
      return data;
    },
    enabled: vin.length === 17,
    retry: false,
  });
}

export function useAddVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vehicle: Partial<Vehicle>) => api.post('/api/vehicles', vehicle),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Vehicle> & { id: string }) =>
      api.put(`/api/vehicles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/vehicles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

// ─── Quotes ────────────────────────────────────────────────────────────────

export function useRequestQuotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) =>
      api.post('/api/quotes/request', { vehicleId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote-history'] }),
  });
}

export function useQuoteHistory() {
  return useQuery<QuoteRequest[]>({
    queryKey: ['quote-history'],
    queryFn: async () => {
      const { data } = await api.get('/api/quotes/history');
      return data.history;
    },
  });
}

export function useQuoteRequest(requestId: string) {
  return useQuery<QuoteRequest>({
    queryKey: ['quote-request', requestId],
    queryFn: async () => {
      const { data } = await api.get(`/api/quotes/history/${requestId}`);
      return data.quoteRequest;
    },
    enabled: !!requestId,
  });
}

// ─── Alerts ────────────────────────────────────────────────────────────────

export function useAlerts() {
  return useQuery<AlertConfig[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await api.get('/api/alerts');
      return data.alerts;
    },
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      vehicleId,
      ...updates
    }: { vehicleId: string; enabled?: boolean; frequencyMonths?: number }) =>
      api.put(`/api/alerts/${vehicleId}`, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
