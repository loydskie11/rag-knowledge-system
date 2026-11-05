import React from 'react';
import type { KPIData } from '../types/survey';
import { getScoreRating } from '../utils/analytics';

interface KPICardsProps {
  kpis: KPIData;
  filteredCount: number;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis, filteredCount }) => {
  const { label: ratingLabel } = getScoreRating(kpis.avgSqdScore);
  const weekDelta = kpis.thisWeekCount - kpis.lastWeekCount;
  const weekPct = kpis.lastWeekCount > 0
    ? Math.abs(Math.round((weekDelta / kpis.lastWeekCount) * 100))
    : kpis.thisWeekCount;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">

      {/* Total Responses */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4 col-span-2 xl:col-span-1">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Responses</p>
        <div className="flex items-baseline justify-between mt-1.5">
          <h3 className="text-2xl font-bold text-gray-900">{kpis.totalResponses.toLocaleString()}</h3>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          {filteredCount !== kpis.totalResponses
            ? `${filteredCount} matching filters`
            : 'All submissions'}
        </p>
        {weekDelta !== 0 && (
          <p className={`text-[11px] font-medium mt-1.5 ${weekDelta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {weekDelta > 0 ? '+' : ''}{weekDelta} vs last week
          </p>
        )}
      </div>

      {/* Avg SQD Score */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Avg SQD Score</p>
        <div className="flex items-baseline justify-between mt-1.5">
          <h3 className="text-2xl font-bold text-gray-900">{kpis.avgSqdScore}</h3>
          <span className="text-[11px] text-gray-400 font-medium">/ 5</span>
        </div>
        <p className="text-[11px] text-[#DD7230] font-semibold mt-1">{ratingLabel}</p>
      </div>

      {/* Satisfaction Rate */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Satisfaction</p>
        <div className="flex items-baseline justify-between mt-1.5">
          <h3 className="text-2xl font-bold text-gray-900">{kpis.satisfactionRate}%</h3>
        </div>
        <div className="mt-2 bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${kpis.satisfactionRate}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Agree + Strongly Agree</p>
      </div>

      {/* Most Visited Office */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Top Office</p>
        <p className="text-sm font-bold text-gray-800 mt-1.5 leading-tight line-clamp-2">
          {kpis.topOffice || '—'}
        </p>
        <p className="text-[11px] text-gray-400 mt-1">Most visited</p>
      </div>

      {/* Top Service */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Top Service</p>
        <p className="text-sm font-bold text-gray-800 mt-1.5 leading-tight line-clamp-2">
          {kpis.topService || '—'}
        </p>
        <p className="text-[11px] text-gray-400 mt-1">Most availed</p>
      </div>

      {/* This Week */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">This Week</p>
        <div className="flex items-baseline justify-between mt-1.5">
          <h3 className="text-2xl font-bold text-gray-900">{kpis.thisWeekCount}</h3>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">{kpis.lastWeekCount} last week</p>
        {weekPct > 0 && (
          <p className={`text-[11px] font-medium mt-1 ${weekDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {weekPct}% {weekDelta >= 0 ? 'increase' : 'decrease'}
          </p>
        )}
      </div>

    </div>
  );
};
