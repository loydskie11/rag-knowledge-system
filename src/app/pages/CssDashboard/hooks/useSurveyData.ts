import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../../api/client';
import type { SurveyResponse, DashboardFilters } from '../types/survey';

export const getResponseYear = (row: SurveyResponse): string => {
  if (row.survey_year) return String(row.survey_year);
  if (row.survey_date && row.survey_date.length >= 4) return row.survey_date.substring(0, 4);
  if (row.date_of_service && row.date_of_service.length >= 4) return row.date_of_service.substring(0, 4);
  if (row.created_at) {
    const parsed = new Date(row.created_at);
    if (!isNaN(parsed.getTime())) return parsed.getFullYear().toString();
  }
  return '';
};

const DEFAULT_FILTERS: DashboardFilters = {
  year: 'all',
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
  availableYears: string[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  resetFilters: () => void;
  refetch: () => void;
  lastUpdated: Date | null;
  syncStatus: SurveySyncStatus | null;
  syncing: boolean;
  syncNow: () => Promise<void>;
}

export interface SurveySyncStatus {
  configured: boolean;
  status: 'never' | 'running' | 'success' | 'failed';
  last_sync?: string | null;
  inserted_count?: number;
  skipped_count?: number;
  error_message?: string | null;
}

export function useSurveyData(): UseSurveyDataReturn {
  const [data, setData] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SurveySyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/css-responses/sync-status');
      const status = response.data as SurveySyncStatus;
      setSyncStatus(status);
      return status;
    } catch {
      // Cloud status must never prevent access to already-local responses.
      return null;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const response = await apiClient.post('/api/css-responses/sync');
      setSyncStatus(response.data as SurveySyncStatus);
      await fetchData();
    } catch (err: any) {
      await fetchSyncStatus();
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [fetchData, fetchSyncStatus, syncing]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    const checkForCloudResponses = async () => {
      const status = await fetchSyncStatus();
      if (!active || !status?.configured || status.status === 'running') return;
      const lastSync = status.last_sync ? new Date(status.last_sync).getTime() : 0;
      const stale = !lastSync || Date.now() - lastSync > 5 * 60 * 1000;
      if (stale) {
        try { await syncNow(); } catch { /* Existing local data remains usable offline. */ }
      }
    };
    void checkForCloudResponses();
    const interval = window.setInterval(checkForCloudResponses, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [fetchSyncStatus, syncNow]);

  // Derive distinct years from data + current year
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const yearsSet = new Set<string>([currentYear]);
    data.forEach((r) => {
      const yr = getResponseYear(r);
      if (yr) yearsSet.add(yr);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [data]);

  // Apply client-side filters
  const filteredData = data.filter((row) => {
    // Filter by Year
    if (filters.year && filters.year !== 'all') {
      const rowYear = getResponseYear(row);
      if (rowYear !== filters.year) return false;
    }
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
    availableYears,
    loading,
    error,
    connected,
    filters,
    setFilters,
    resetFilters,
    refetch: fetchData,
    lastUpdated,
    syncStatus,
    syncing,
    syncNow,
  };
}
