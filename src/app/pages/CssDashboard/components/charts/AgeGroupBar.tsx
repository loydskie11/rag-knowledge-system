import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { SurveyResponse } from '../../types/survey';
import { countByAgeGroup } from '../../utils/analytics';

interface Props { data: SurveyResponse[]; }

const COLORS = ['#47BFFF', '#863BFF', '#FF9501', '#10B981', '#F59E0B', '#F43F5E'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">Age Group: {label}</div>
        <div className="chart-tooltip-value">{payload[0].value} respondents</div>
      </div>
    );
  }
  return null;
};

export const AgeGroupBar: React.FC<Props> = ({ data }) => {
  const groups = countByAgeGroup(data);

  if (data.length === 0) return <div className="chart-empty"><span>No data</span></div>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={groups} margin={{ top: 8, right: 10, left: -20, bottom: 0 }} barSize={30}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-text-secondary)' }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {groups.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
