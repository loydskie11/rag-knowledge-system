import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import type { SurveyResponse } from '../../types/survey';
import { getSqdAverages } from '../../utils/analytics';

interface Props { data: SurveyResponse[]; }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">{label}</div>
        <div className="chart-tooltip-value">{payload[0].value.toFixed(2)} / 5</div>
      </div>
    );
  }
  return null;
};

export const SQDRadar: React.FC<Props> = ({ data }) => {
  const averages = getSqdAverages(data);
  const chartData = averages.map((a) => ({ subject: a.label, score: a.avg, fullMark: 5 }));

  if (data.length === 0) return <div className="chart-empty"><span>No data</span></div>;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={chartData} outerRadius="75%">
        <PolarGrid stroke="var(--color-border)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-text-secondary)' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
          tickCount={6}
        />
        <Radar
          name="Avg Score"
          dataKey="score"
          stroke="#FF9501"
          fill="#FF9501"
          fillOpacity={0.25}
          strokeWidth={2}
          dot={{ fill: '#FF9501', r: 4 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={() => (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Average Score (1–5)
            </span>
          )}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
