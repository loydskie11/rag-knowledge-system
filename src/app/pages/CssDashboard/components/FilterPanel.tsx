import React from 'react';
import { X, RotateCcw, Search } from 'lucide-react';
import type { DashboardFilters, SurveyResponse } from '../types/survey';

interface FilterPanelProps {
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  resetFilters: () => void;
  data: SurveyResponse[];
  hideOfficeFilter?: boolean;
}

const CAMPUSES = ['Argao', 'Oslob', 'Ginatilan'];
const CLIENT_TYPES = ['Citizen/Individual', 'Business', 'Government employee'];
const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'];

function toggleArray(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

function ToggleTag({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-[#DD7230] text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters, setFilters, resetFilters, data, hideOfficeFilter,
}) => {
  const offices = Array.from(new Set(data.map((r) => r.office_visited).filter(Boolean))).sort() as string[];
  const services = Array.from(new Set(data.map((r) => r.service_availed).filter(Boolean))).sort() as string[];

  const hasActiveFilters =
    filters.campus.length > 0 ||
    filters.office_visited !== '' ||
    filters.client_type.length > 0 ||
    filters.gender.length > 0 ||
    filters.service_availed !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.search !== '';

  const activeFilterLabels: { key: string; label: string; remove: () => void }[] = [];
  filters.campus.forEach((c) =>
    activeFilterLabels.push({ key: `campus-${c}`, label: `Campus: ${c}`, remove: () => setFilters((f) => ({ ...f, campus: f.campus.filter((x) => x !== c) })) })
  );
  filters.client_type.forEach((ct) =>
    activeFilterLabels.push({ key: `ct-${ct}`, label: `Type: ${ct}`, remove: () => setFilters((f) => ({ ...f, client_type: f.client_type.filter((x) => x !== ct) })) })
  );
  filters.gender.forEach((g) =>
    activeFilterLabels.push({ key: `gender-${g}`, label: `Gender: ${g}`, remove: () => setFilters((f) => ({ ...f, gender: f.gender.filter((x) => x !== g) })) })
  );
  if (filters.office_visited) activeFilterLabels.push({ key: 'office', label: `Office: ${filters.office_visited}`, remove: () => setFilters((f) => ({ ...f, office_visited: '' })) });
  if (filters.service_availed) activeFilterLabels.push({ key: 'service', label: `Service: ${filters.service_availed.substring(0, 28)}…`, remove: () => setFilters((f) => ({ ...f, service_availed: '' })) });
  if (filters.dateFrom) activeFilterLabels.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}`, remove: () => setFilters((f) => ({ ...f, dateFrom: '' })) });
  if (filters.dateTo) activeFilterLabels.push({ key: 'dateTo', label: `To: ${filters.dateTo}`, remove: () => setFilters((f) => ({ ...f, dateTo: '' })) });

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">
          Filter Results
          {hasActiveFilters && (
            <span className="ml-2 px-1.5 py-0.5 bg-[#DD7230] text-white text-[10px] font-bold rounded">
              {activeFilterLabels.length} active
            </span>
          )}
        </p>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]/30 focus:border-[#DD7230] transition-colors"
          placeholder="Search suggestions, offices, services…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-4">

        {/* Campus */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Campus</p>
          <div className="flex flex-wrap gap-1.5">
            {CAMPUSES.map((c) => (
              <ToggleTag
                key={c} label={c}
                active={filters.campus.includes(c)}
                onClick={() => setFilters((f) => ({ ...f, campus: toggleArray(f.campus, c) }))}
              />
            ))}
          </div>
        </div>

        {/* Client Type */}
        <div className="col-span-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Client Type</p>
          <div className="flex flex-wrap gap-1.5">
            {CLIENT_TYPES.map((ct) => (
              <ToggleTag
                key={ct} label={ct}
                active={filters.client_type.includes(ct)}
                onClick={() => setFilters((f) => ({ ...f, client_type: toggleArray(f.client_type, ct) }))}
              />
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="col-span-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gender</p>
          <div className="flex flex-wrap gap-1.5">
            {GENDERS.map((g) => (
              <ToggleTag
                key={g} label={g}
                active={filters.gender.includes(g)}
                onClick={() => setFilters((f) => ({ ...f, gender: toggleArray(f.gender, g) }))}
              />
            ))}
          </div>
        </div>

        {/* Date From */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Date From</p>
          <input
            type="date"
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]/30 focus:border-[#DD7230] transition-colors"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
        </div>

        {/* Date To */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Date To</p>
          <input
            type="date"
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]/30 focus:border-[#DD7230] transition-colors"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </div>

        {/* Office Visited */}
        {!hideOfficeFilter && (
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Office Visited</p>
            <select
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]/30 focus:border-[#DD7230] transition-colors"
              value={filters.office_visited}
              onChange={(e) => setFilters((f) => ({ ...f, office_visited: e.target.value }))}
            >
              <option value="">All Offices</option>
              {offices.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}

        {/* Service Availed */}
        <div className="col-span-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Service Availed</p>
          <select
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]/30 focus:border-[#DD7230] transition-colors"
            value={filters.service_availed}
            onChange={(e) => setFilters((f) => ({ ...f, service_availed: e.target.value }))}
          >
            <option value="">All Services</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider self-center mr-1">Active:</span>
          {activeFilterLabels.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#DD7230]/10 text-[#DD7230] text-[11px] font-medium rounded-full border border-[#DD7230]/20"
            >
              {f.label}
              <button
                onClick={f.remove}
                className="text-[#DD7230] hover:text-[#c4612a] transition-colors cursor-pointer"
                title="Remove filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
