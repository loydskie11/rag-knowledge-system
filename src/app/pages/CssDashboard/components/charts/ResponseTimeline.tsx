import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { SurveyResponse } from '../../types/survey';
import { getResponseTimeline, formatDate } from '../../utils/analytics';

interface Props { data: SurveyResponse[]; }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">{label ? formatDate(label) : ''}</div>
        <div className="chart-tooltip-value">{payload[0].value} responses</div>
      </div>
    );
  }
  return null;
};

export const ResponseTimeline: React.FC<Props> = ({ data }) => {
  const timeline = getResponseTimeline(data);

  if (data.length === 0) return <div className="chart-empty"><span>No timeline data</span></div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={timeline} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF9501" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#FF9501" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
          tickFormatter={(v) => {
            try { return new Date(v).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); }
            catch { return v; }
          }}
        />
        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#FF9501"
          strokeWidth={2.5}
          fill="url(#timelineGradient)"
          dot={{ fill: '#FF9501', r: 4, strokeWidth: 2, stroke: 'white' }}
          activeDot={{ r: 6, fill: '#FF9501', stroke: 'white', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
