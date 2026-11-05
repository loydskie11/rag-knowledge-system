import React, { useState } from 'react';
import { MessageSquare, Calendar, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SurveyResponse } from '../types/survey';
import { formatDate } from '../utils/analytics';

interface Props {
  data: SurveyResponse[];
  pageSize?: number;
}

export const SuggestionsPanel: React.FC<Props> = ({ data, pageSize = 6 }) => {
  const [page, setPage] = useState(0);

  const withSuggestions = data.filter(
    (r) => r.suggestions && r.suggestions.trim() && r.suggestions.trim().toLowerCase() !== 'none'
  );

  const totalPages = Math.ceil(withSuggestions.length / pageSize);
  const paginated = withSuggestions.slice(page * pageSize, (page + 1) * pageSize);

  if (withSuggestions.length === 0) {
    return (
      <div className="chart-empty" style={{ height: 120 }}>
        <MessageSquare size={24} color="var(--color-text-placeholder)" />
        <span>No suggestions submitted yet</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {withSuggestions.length} suggestion{withSuggestions.length !== 1 ? 's' : ''}
        </span>
        <span className="badge badge-primary">
          {withSuggestions.length} / {data.length} responses
        </span>
      </div>

      <div>
        {paginated.map((row) => (
          <div key={row.id} className="suggestion-card animate-fade-in">
            <div className="suggestion-text">
              "{row.suggestions}"
            </div>
            <div className="suggestion-meta">
              <span className="suggestion-meta-item">
                <Calendar size={10} />
                {formatDate(row.date_of_service || row.created_at)}
              </span>
              <span className="suggestion-meta-item">
                <Building2 size={10} />
                {row.office_visited || '—'}
              </span>
              {row.campus && (
                <span className="badge badge-primary" style={{ fontSize: '0.62rem', padding: '1px 8px' }}>
                  {row.campus}
                </span>
              )}
              {row.full_name && (
                <span className="suggestion-meta-item">
                  — {row.full_name}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="table-pagination" style={{ background: 'none', border: 'none', padding: '12px 0 0' }}>
          <span className="pagination-info">
            Page {page + 1} of {totalPages}
          </span>
          <div className="pagination-controls">
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = Math.min(Math.max(page - 2, 0) + i, totalPages - 1);
              return (
                <button
                  key={pageNum}
                  className={`page-btn ${pageNum === page ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
