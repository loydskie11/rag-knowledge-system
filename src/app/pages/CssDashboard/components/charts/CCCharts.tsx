import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import type { SurveyResponse } from '../../types/survey';
import { getCCDistribution, shortLabel } from '../../utils/analytics';

interface Props { data: SurveyResponse[]; }

const CC_COLORS: Record<string, string> = {
  'Yes, I know and I saw': '#10B981',
  'Yes, I know but I did NOT': '#F59E0B',
  'Yes, it was easy': '#10B981',
  'Yes, somewhat easy': '#47BFFF',
  'No, it is difficult': '#F97316',
  'No, it is not visible': '#EF4444',
  'No, and I only know': '#863BFF',
  'No, I do not know': '#EF4444',
  'Yes, it helped very much': '#10B981',
  'Yes, it somewhat helped': '#47BFFF',
  'No, it did not help': '#EF4444',
  'Not Applicable': '#9CA3AF',
};

function getColor(name: string): string {
  const match = Object.keys(CC_COLORS).find((k) => name.includes(k));
  return match ? CC_COLORS[match] : '#9CA3AF';
}

const CC_FIELDS: { field: 'cc1' | 'cc2' | 'cc3'; label: string }[] = [
  { field: 'cc1', label: "CC1 — Awareness of Citizen's Charter" },
  { field: 'cc2', label: 'CC2 — Visibility of Citizen\'s Charter' },
  { field: 'cc3', label: 'CC3 — Helpfulness of Citizen\'s Charter' },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip" style={{ maxWidth: 260 }}>
        <div className="chart-tooltip-label" style={{ marginBottom: 8 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ fontSize: '0.72rem', marginBottom: 4, color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ marginRight: 6 }}>{p.value}</span>
            <span style={{ opacity: 0.7 }}>{p.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const CCCharts: React.FC<Props> = ({ data }) => {
  if (data.length === 0) return <div className="chart-empty"><span>No data</span></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {CC_FIELDS.map(({ field, label }) => {
        const distribution = getCCDistribution(data, field);
        const chartData = distribution.map((d) => ({
          name: shortLabel(d.name, 36),
          value: d.value,
        }));
        const total = chartData.reduce((s, d) => s + d.value, 0);

        return (
          <div key={field}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
              {label}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={200}
                  tick={{ fontSize: 9.5, fill: 'var(--color-text-secondary)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={getColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
};
