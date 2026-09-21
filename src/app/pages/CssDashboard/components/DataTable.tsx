import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, ArrowUpDown, Search } from 'lucide-react';
import type { SurveyResponse } from '../types/survey';
import { exportToCSV, formatDate } from '../utils/analytics';

interface Props {
  data: SurveyResponse[];
  pageSize?: number;
}

type SortDir = 'asc' | 'desc';

const COLUMNS: { key: keyof SurveyResponse; label: string; width?: number }[] = [
  { key: 'created_at', label: 'Submitted', width: 110 },
  { key: 'client_type', label: 'Client Type', width: 120 },
  { key: 'gender', label: 'Gender', width: 80 },
  { key: 'age', label: 'Age', width: 60 },
  { key: 'campus', label: 'Campus', width: 90 },
  { key: 'office_visited', label: 'Office', width: 140 },
  { key: 'service_availed', label: 'Service', width: 350 },
  { key: 'sqd0', label: 'SQD0', width: 120 },
  { key: 'sqd1', label: 'SQD1', width: 120 },
  { key: 'sqd2', label: 'SQD2', width: 120 },
  { key: 'sqd3', label: 'SQD3', width: 120 },
  { key: 'sqd4', label: 'SQD4', width: 120 },
  { key: 'sqd5', label: 'SQD5', width: 120 },
  { key: 'sqd6', label: 'SQD6', width: 120 },
  { key: 'sqd7', label: 'SQD7', width: 120 },
  { key: 'sqd8', label: 'SQD8', width: 120 },
  { key: 'suggestions', label: 'Suggestions', width: 200 },
];

const LIKERT_BADGE: Record<string, string> = {
  'Strongly Agree': '#059669',
  'Agree': '#10B981',
  'Neither Agree nor Disagree': '#F59E0B',
  'Disagree': '#F97316',
  'Strongly Disagree': '#EF4444',
  'Not Applicable (N/A)': '#9CA3AF',
};

function renderCell(key: keyof SurveyResponse, value: string | number): React.ReactNode {
  if (key === 'created_at' || key === 'date_of_service') {
    return <span style={{ whiteSpace: 'nowrap' }}>{formatDate(String(value))}</span>;
  }
  if (key.startsWith('sqd') && LIKERT_BADGE[String(value)]) {
    const color = LIKERT_BADGE[String(value)];
    const short = String(value).replace('Strongly ', 'Str. ').replace('Neither Agree nor Disagree', 'Neutral');
    return (
      <span style={{
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: '0.65rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}>
        {short}
      </span>
    );
  }
  if (!value && value !== 0) return <span style={{ color: 'var(--color-text-placeholder)' }}>—</span>;
  return String(value);
}

export const DataTable: React.FC<Props> = ({ data, pageSize = 10 }) => {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<keyof SurveyResponse>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: keyof SurveyResponse) => {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <div>
      {/* Table Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]/30 focus:border-[#DD7230] transition-colors"
            placeholder="Search across all columns…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
          {filtered.length.toLocaleString()} of {data.length.toLocaleString()} rows
        </span>
        <button
          onClick={() => exportToCSV(filtered)}
          title="Export filtered data to CSV"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#DD7230] text-white text-xs font-semibold rounded-lg hover:bg-[#c4612a] transition-colors shadow-2xs shrink-0 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={{ minWidth: col.width, maxWidth: col.width, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort(col.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    <ArrowUpDown
                      size={10}
                      style={{ opacity: sortKey === col.key ? 1 : 0.3, color: sortKey === col.key ? 'var(--color-primary)' : 'inherit' }}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                  No results found
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {page * pageSize + idx + 1}
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} style={{ minWidth: col.width, maxWidth: col.width }}>
                      {renderCell(col.key, row[col.key] as string | number)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 flex-wrap gap-3">
          <span className="text-xs text-gray-400 font-medium">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs"
              onClick={() => setPage(0)} disabled={page === 0}
            >«</button>
            <button
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              onClick={() => setPage((p) => p - 1)} disabled={page === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const offset = Math.max(0, Math.min(page - 2, totalPages - 5));
              const p = offset + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    p === page
                      ? 'bg-[#DD7230] text-white'
                      : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              onClick={() => setPage((p) => p + 1)} disabled={page === totalPages - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs"
              onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1}
            >»</button>
          </div>
        </div>
      )}
    </div>
  );
};
