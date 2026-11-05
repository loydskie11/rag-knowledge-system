import type { SurveyResponse, KPIData, ChartDataPoint, SQDAverage, LikertScale } from '../types/survey';
import { LIKERT_SCORE, SQD_SHORT_LABELS } from '../types/survey';

/* ============================================================
   Analytics Utility Functions
   ============================================================ */

/**
 * Count frequency of values for a given field
 */
export function countByField(
  data: SurveyResponse[],
  field: keyof SurveyResponse
): ChartDataPoint[] {
  const counts: Record<string, number> = {};
  data.forEach((row) => {
    const val = String(row[field] || 'Unknown');
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Count by age groups
 */
export function countByAgeGroup(data: SurveyResponse[]): ChartDataPoint[] {
  const groups: Record<string, number> = {
    'Under 20': 0,
    '20–29': 0,
    '30–39': 0,
    '40–49': 0,
    '50–59': 0,
    '60+': 0,
  };
  data.forEach((row) => {
    const age = Number(row.age);
    if (age < 20) groups['Under 20']++;
    else if (age < 30) groups['20–29']++;
    else if (age < 40) groups['30–39']++;
    else if (age < 50) groups['40–49']++;
    else if (age < 60) groups['50–59']++;
    else groups['60+']++;
  });
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
}

/**
 * Convert Likert scale text to numeric score (excludes N/A)
 */
function likertToScore(val: string): number | null {
  const score = LIKERT_SCORE[val as LikertScale];
  if (val === 'Not Applicable (N/A)' || score === 0) return null;
  return score;
}

/**
 * Compute average SQD score (1–5) across all SQD dimensions
 */
export function computeAvgSqdScore(data: SurveyResponse[]): number {
  const sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'] as const;
  let total = 0;
  let count = 0;
  data.forEach((row) => {
    sqdKeys.forEach((key) => {
      const score = likertToScore(row[key]);
      if (score !== null) {
        total += score;
        count++;
      }
    });
  });
  return count > 0 ? Number((total / count).toFixed(2)) : 0;
}

/**
 * Compute satisfaction rate = % of (Strongly Agree + Agree) among valid answers
 */
export function computeSatisfactionRate(data: SurveyResponse[]): number {
  const sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'] as const;
  let satisfied = 0;
  let total = 0;
  data.forEach((row) => {
    sqdKeys.forEach((key) => {
      const val = row[key];
      if (val && val !== 'Not Applicable (N/A)') {
        total++;
        if (val === 'Strongly Agree' || val === 'Agree') satisfied++;
      }
    });
  });
  return total > 0 ? Number(((satisfied / total) * 100).toFixed(1)) : 0;
}

/**
 * Get SQD averages per dimension for radar/bar charts
 */
export function getSqdAverages(data: SurveyResponse[]): SQDAverage[] {
  const sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'] as const;

  return sqdKeys.map((key) => {
    const distribution: Record<LikertScale, number> = {
      'Strongly Agree': 0,
      'Agree': 0,
      'Neither Agree nor Disagree': 0,
      'Disagree': 0,
      'Strongly Disagree': 0,
      'Not Applicable (N/A)': 0,
    };
    let total = 0;
    let count = 0;

    data.forEach((row) => {
      const val = row[key] as LikertScale;
      if (val && distribution[val] !== undefined) {
        distribution[val]++;
        const score = likertToScore(val);
        if (score !== null) {
          total += score;
          count++;
        }
      }
    });

    return {
      id: key,
      label: SQD_SHORT_LABELS[key],
      avg: count > 0 ? Number((total / count).toFixed(2)) : 0,
      distribution,
    };
  });
}

/**
 * Get SQD distribution data for stacked bar chart
 */
export function getSqdDistributionData(data: SurveyResponse[]): ChartDataPoint[] {
  const averages = getSqdAverages(data);
  return averages.map((sqd) => ({
    name: sqd.label,
    'Strongly Agree': sqd.distribution['Strongly Agree'],
    'Agree': sqd.distribution['Agree'],
    'Neither Agree nor Disagree': sqd.distribution['Neither Agree nor Disagree'],
    'Disagree': sqd.distribution['Disagree'],
    'Strongly Disagree': sqd.distribution['Strongly Disagree'],
    'Not Applicable (N/A)': sqd.distribution['Not Applicable (N/A)'],
    value: sqd.avg,
  }));
}

/**
 * Get top N items from a counted field
 */
export function getTopN(data: ChartDataPoint[], n: number): ChartDataPoint[] {
  return data.slice(0, n);
}

/**
 * Get responses grouped by date (for timeline)
 */
export function getResponseTimeline(data: SurveyResponse[]): ChartDataPoint[] {
  const counts: Record<string, number> = {};
  data.forEach((row) => {
    const date = row.created_at
      ? new Date(row.created_at).toISOString().split('T')[0]
      : 'Unknown';
    counts[date] = (counts[date] || 0) + 1;
  });
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name, value }));
}

/**
 * Compute KPI data object
 */
export function computeKPIs(data: SurveyResponse[]): KPIData {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const thisWeekCount = data.filter((r) => {
    const d = new Date(r.created_at);
    return d >= startOfThisWeek;
  }).length;

  const lastWeekCount = data.filter((r) => {
    const d = new Date(r.created_at);
    return d >= startOfLastWeek && d < startOfThisWeek;
  }).length;

  const officeCounts = countByField(data, 'office_visited');
  const serviceCounts = countByField(data, 'service_availed');

  return {
    totalResponses: data.length,
    avgSqdScore: computeAvgSqdScore(data),
    satisfactionRate: computeSatisfactionRate(data),
    topOffice: officeCounts[0]?.name || 'N/A',
    topService: serviceCounts[0]?.name || 'N/A',
    thisWeekCount,
    lastWeekCount,
  };
}

/**
 * Get CC question distribution data
 */
export function getCCDistribution(
  data: SurveyResponse[],
  field: 'cc1' | 'cc2' | 'cc3'
): ChartDataPoint[] {
  return countByField(data, field);
}

/**
 * Shorten long labels for charts
 */
export function shortLabel(label: string, maxLen = 28): string {
  if (label.length <= maxLen) return label;
  // Remove Cebuano part (inside parentheses)
  const withoutCebuano = label.replace(/\s*\([^)]+\)\s*/g, '').trim();
  if (withoutCebuano.length <= maxLen) return withoutCebuano;
  return withoutCebuano.substring(0, maxLen) + '…';
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Get score rating label
 */
export function getScoreRating(score: number): { label: string; cls: string } {
  if (score >= 4.5) return { label: 'Excellent', cls: 'excellent' };
  if (score >= 3.5) return { label: 'Good', cls: 'good' };
  if (score >= 2.5) return { label: 'Fair', cls: 'fair' };
  return { label: 'Poor', cls: 'poor' };
}

/**
 * Export data to CSV
 */
export function exportToCSV(data: SurveyResponse[], filename = 'css_survey_data'): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]) as (keyof SurveyResponse)[];
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
