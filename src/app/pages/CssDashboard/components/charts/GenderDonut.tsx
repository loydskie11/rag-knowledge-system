import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { SurveyResponse } from '../../types/survey';
import { countByField } from '../../utils/analytics';

const COLORS = ['#863BFF', '#FF9501', '#47BFFF', '#10B981', '#F43F5E', '#F59E0B'];

interface Props { data: SurveyResponse[]; }

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { pct: number } }[]
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">{payload[0].name}</div>
        <div className="chart-tooltip-value">{payload[0].value} responses</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
          {payload[0].payload.pct}% of total
        </div>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius } = props;
  const cxNum = Number(cx ?? 0);
  const cyNum = Number(cy ?? 0);
  const midAngleNum = Number(midAngle ?? 0);
  const innerRadiusNum = Number(innerRadius ?? 0);
  const outerRadiusNum = Number(outerRadius ?? 0);
  const pct = Number((props as { pct?: number }).pct ?? 0);

  if (pct < 5) return null;
  const radius = innerRadiusNum + (outerRadiusNum - innerRadiusNum) * 0.5;
  const x = cxNum + radius * Math.cos(-midAngleNum * RADIAN);
  const y = cyNum + radius * Math.sin(-midAngleNum * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${pct}%`}
    </text>
  );
};

export const GenderDonut: React.FC<Props> = ({ data }) => {
  const counts = countByField(data, 'gender');
  const total = counts.reduce((s, d) => s + d.value, 0);
  const chartData = counts.map((d) => ({ ...d, pct: Math.round((d.value / total) * 100) }));

  if (data.length === 0) return (
    <div className="chart-empty">
      <span>No data available</span>
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
