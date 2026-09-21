import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { SurveyResponse } from '../../types/survey';
import { countByField } from '../../utils/analytics';

interface Props { data: SurveyResponse[]; }

const COLORS = ['#FF9501', '#863BFF', '#47BFFF'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">{label} Campus</div>
        <div className="chart-tooltip-value">{payload[0].value} responses</div>
      </div>
    );
  }
  return null;
};

export const CampusBar: React.FC<Props> = ({ data }) => {
  const counts = countByField(data, 'campus');

  if (data.length === 0) return <div className="chart-empty"><span>No data</span></div>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={counts} margin={{ top: 8, right: 10, left: -20, bottom: 0 }} barSize={48}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: 'var(--color-text-secondary)' }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {counts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
