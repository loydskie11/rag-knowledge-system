import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { SurveyResponse } from '../../types/survey';
import { countByField, getTopN, shortLabel } from '../../utils/analytics';

interface Props { data: SurveyResponse[]; topN?: number; }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">{label}</div>
        <div className="chart-tooltip-value">{payload[0].value} visits</div>
      </div>
    );
  }
  return null;
};

export const OfficesBar: React.FC<Props> = ({ data, topN = 10 }) => {
  const counts = getTopN(countByField(data, 'office_visited'), topN);
  const chartData = counts.map((d) => ({ ...d, name: shortLabel(d.name, 22) }));
  const maxVal = Math.max(...chartData.map((d) => d.value), 1);

  if (data.length === 0) return <div className="chart-empty"><span>No data</span></div>;

  return (
    <ResponsiveContainer width="100%" height={Math.max(counts.length * 40, 200)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
        <YAxis
          dataKey="name"
          type="category"
          width={130}
          tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-text-secondary)' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
          {chartData.map((entry, i) => {
            const intensity = 0.4 + (entry.value / maxVal) * 0.6;
            return <Cell key={i} fill={`rgba(255, 149, 1, ${intensity})`} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
