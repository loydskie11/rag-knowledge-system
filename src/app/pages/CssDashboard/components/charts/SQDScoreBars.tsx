import React from 'react';
import type { SurveyResponse } from '../../types/survey';
import { getSqdAverages, getScoreRating } from '../../utils/analytics';

interface Props { data: SurveyResponse[]; }

export const SQDScoreBars: React.FC<Props> = ({ data }) => {
  const averages = getSqdAverages(data);

  if (data.length === 0) return <div className="chart-empty"><span>No data</span></div>;

  return (
    <div>
      {averages.map((sqd) => {
        const { label: ratingLabel, cls } = getScoreRating(sqd.avg);
        const pct = (sqd.avg / 5) * 100;
        return (
          <div key={sqd.id} className="sqd-item">
            <div className="sqd-label">{sqd.id.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.68rem', fontWeight: 600,
                color: 'var(--color-text-muted)', marginBottom: 4,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {sqd.label}
              </div>
              <div className="sqd-bar-track">
                <div
                  className="sqd-bar-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="sqd-score">
              {sqd.avg > 0 ? sqd.avg.toFixed(2) : '—'}
            </div>
            <span className={`score-pill ${cls}`} style={{ fontSize: '0.62rem', padding: '1px 7px' }}>
              {sqd.avg > 0 ? ratingLabel : 'N/A'}
            </span>
          </div>
        );
      })}
    </div>
  );
};
