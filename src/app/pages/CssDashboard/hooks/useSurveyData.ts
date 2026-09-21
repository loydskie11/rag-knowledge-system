import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../api/client';
import type { SurveyResponse, DashboardFilters } from '../types/survey';

const DEFAULT_FILTERS: DashboardFilters = {
  campus: [],
  office_visited: '',
  client_type: [],
  gender: [],
  service_availed: '',
  dateFrom: '',
  dateTo: '',
  search: '',
};

interface UseSurveyDataReturn {
  data: SurveyResponse[];
  filteredData: SurveyResponse[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  resetFilters: () => void;
  refetch: () => void;
  lastUpdated: Date | null;
}

export function useSurveyData(): UseSurveyDataReturn {
  const [data, setData] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/css-responses');
      setData(response.data || []);
      setConnected(true);
      setLastUpdated(new Date());
    } catch (err: any) {
      const message = err?.response?.data?.detail || err.message || 'Failed to fetch CSS responses.';
      setError(message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // In FastAPI, we can't do direct real-time subscriptions without websockets.
    // We can do polling if necessary, but fetching on mount/refetch is fine for now.
  }, [fetchData]);

  // Apply client-side filters
  const filteredData = data.filter((row) => {
    if (filters.campus.length > 0 && !filters.campus.includes(row.campus)) return false;
    if (filters.office_visited && row.office_visited !== filters.office_visited) return false;
    if (filters.client_type.length > 0 && !filters.client_type.includes(row.client_type)) return false;
    if (filters.gender.length > 0 && !filters.gender.includes(row.gender)) return false;
    if (filters.service_availed && row.service_availed !== filters.service_availed) return false;
    if (filters.dateFrom) {
      const rowDate = new Date(row.date_of_service || row.created_at);
      const fromDate = new Date(filters.dateFrom);
      if (rowDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const rowDate = new Date(row.date_of_service || row.created_at);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59);
      if (rowDate > toDate) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        row.suggestions?.toLowerCase().includes(q) ||
        row.full_name?.toLowerCase().includes(q) ||
        row.office_visited?.toLowerCase().includes(q) ||
        row.service_availed?.toLowerCase().includes(q) ||
        row.campus?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    data,
    filteredData,
    loading,
    error,
    connected,
    filters,
    setFilters,
    resetFilters,
    refetch: fetchData,
    lastUpdated,
  };
}
