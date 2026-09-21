/* ============================================================
   TypeScript Types for CSS Survey Responses
   ============================================================ */

export type LikertScale =
  | 'Strongly Agree'
  | 'Agree'
  | 'Neither Agree nor Disagree'
  | 'Disagree'
  | 'Strongly Disagree'
  | 'Not Applicable (N/A)';

export interface SurveyResponse {
  id: string;
  created_at: string;
  client_type: string;
  date_of_service: string;
  gender: string;
  age: number;
  region: string;
  service_availed: string;
  campus: string;
  office_visited: string;
  office_other: string;
  cc1: string;
  cc2: string;
  cc3: string;
  sqd0: LikertScale;
  sqd1: LikertScale;
  sqd2: LikertScale;
  sqd3: LikertScale;
  sqd4: LikertScale;
  sqd5: LikertScale;
  sqd6: LikertScale;
  sqd7: LikertScale;
  sqd8: LikertScale;
  suggestions: string;
  full_name: string;
  email: string;
}

export interface DashboardFilters {
  campus: string[];
  office_visited: string;
  client_type: string[];
  gender: string[];
  service_availed: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

export interface KPIData {
  totalResponses: number;
  avgSqdScore: number;
  satisfactionRate: number;
  topOffice: string;
  topService: string;
  thisWeekCount: number;
  lastWeekCount: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface SQDAverage {
  id: string;
  label: string;
  avg: number;
  distribution: Record<LikertScale, number>;
}

export const SQD_LABELS: Record<string, string> = {
  sqd0: 'SQD0 — Overall Satisfaction',
  sqd1: 'SQD1 — Time Reasonableness',
  sqd2: 'SQD2 — Requirements & Steps Followed',
  sqd3: 'SQD3 — Simple Steps',
  sqd4: 'SQD4 — Information Accessibility',
  sqd5: 'SQD5 — Reasonable Fees',
  sqd6: 'SQD6 — Fairness / No Favoritism',
  sqd7: 'SQD7 — Staff Courtesy',
  sqd8: 'SQD8 — Needs Met',
};

export const SQD_SHORT_LABELS: Record<string, string> = {
  sqd0: 'Satisfaction',
  sqd1: 'Time',
  sqd2: 'Requirements',
  sqd3: 'Simple Steps',
  sqd4: 'Info Access',
  sqd5: 'Fair Fees',
  sqd6: 'Fairness',
  sqd7: 'Courtesy',
  sqd8: 'Needs Met',
};

export const LIKERT_SCALE: LikertScale[] = [
  'Strongly Agree',
  'Agree',
  'Neither Agree nor Disagree',
  'Disagree',
  'Strongly Disagree',
  'Not Applicable (N/A)',
];

export const LIKERT_SCORE: Record<LikertScale, number> = {
  'Strongly Agree': 5,
  'Agree': 4,
  'Neither Agree nor Disagree': 3,
  'Disagree': 2,
  'Strongly Disagree': 1,
  'Not Applicable (N/A)': 0,
};

export const LIKERT_COLORS: Record<LikertScale, string> = {
  'Strongly Agree': '#059669',
  'Agree': '#10B981',
  'Neither Agree nor Disagree': '#F59E0B',
  'Disagree': '#F97316',
  'Strongly Disagree': '#EF4444',
  'Not Applicable (N/A)': '#9CA3AF',
};

export const CHART_COLORS = [
  '#FF9501',
  '#863BFF',
  '#47BFFF',
  '#10B981',
  '#F43F5E',
  '#F59E0B',
  '#6366F1',
  '#EC4899',
  '#14B8A6',
  '#8B5CF6',
];
