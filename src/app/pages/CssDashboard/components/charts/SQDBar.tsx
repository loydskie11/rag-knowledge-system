import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import type { SurveyResponse, LikertScale } from '../../types/survey';
import { LIKERT_COLORS } from '../../types/survey';
import { getSqdDistributionData } from '../../utils/analytics';

interface Props { data: SurveyResponse[]; }

const SCALE_KEYS: LikertScale[] = [
  'Strongly Agree',
  'Agree',
  'Neither Agree nor Disagree',
  'Disagree',
  'Strongly Disagree',
  'Not Applicable (N/A)',
];

const CustomTooltip = ({
  active, payload, label,
}: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip" style={{ minWidth: 200 }}>
        <div className="chart-tooltip-label" style={{ marginBottom: 8 }}>{label}</div>
        {payload.filter((p) => p.value > 0).map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.75)' }}>{p.name}:</span>
            <span style={{ fontWeight: 700, color: 'white' }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const SQDBar: React.FC<Props> = ({ data }) => {
  const chartData = getSqdDistributionData(data);

  if (data.length === 0) return <div className="chart-empty"><span>No data</span></div>;

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
        <YAxis
          dataKey="name"
          type="category"
          width={110}
          tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-text-secondary)' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="square"
          iconSize={8}
          wrapperStyle={{ fontSize: '0.68rem', paddingTop: 16 }}
          formatter={(value) => (
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {value}
            </span>
          )}
        />
        {SCALE_KEYS.map((key) => (
          <Bar key={key} dataKey={key} stackId="a" fill={LIKERT_COLORS[key]} barSize={18} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
