/// <reference types="vite/client" />
import React, { useState } from 'react';
import './index.css';
import { RefreshCw, ListFilter, ShieldAlert } from 'lucide-react';

import { useSurveyData } from './hooks/useSurveyData';
import { computeKPIs } from './utils/analytics';

import { KPICards } from './components/KPICards';
import { FilterPanel } from './components/FilterPanel';
import { GenderDonut } from './components/charts/GenderDonut';
import { ClientTypeBar } from './components/charts/ClientTypeBar';
import { AgeGroupBar } from './components/charts/AgeGroupBar';
import { OfficesBar } from './components/charts/OfficesBar';
import { ServicesBar } from './components/charts/ServicesBar';
import { CampusBar } from './components/charts/CampusBar';
import { CCCharts } from './components/charts/CCCharts';
import { SQDRadar } from './components/charts/SQDRadar';
import { SQDBar } from './components/charts/SQDBar';
import { SQDScoreBars } from './components/charts/SQDScoreBars';
import { ResponseTimeline } from './components/charts/ResponseTimeline';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { DataTable } from './components/DataTable';

const NAV_TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'demographics', label: 'Demographics' },
  { id: 'services',     label: 'Services & Offices' },
  { id: 'charter',      label: "Citizen's Charter" },
  { id: 'sqd',          label: 'Service Quality' },
  { id: 'feedback',     label: 'Feedback' },
  { id: 'table',        label: 'Raw Data' },
];

function ChartCard({
  title, subtitle, badge, children, fullWidth = false,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden"
      style={fullWidth ? { gridColumn: '1 / -1' } : undefined}
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

export const Dashboard: React.FC = () => {
  const userRole = sessionStorage.getItem('userRole') || '';
  const userOffice = sessionStorage.getItem('userAdministrativeOffice') || '';
  const isIqaAuditor = sessionStorage.getItem('isIqaAuditor') === 'true';

  const isGlobalAccess = userRole === 'ADMIN' || isIqaAuditor || userOffice === 'Quality Assurance' || userOffice === 'Management';
  const isScopedAccess = !isGlobalAccess && userRole === 'FACULTY' && userOffice !== '';
  const isRestricted = !isGlobalAccess && !isScopedAccess;

  const { data, filteredData, loading, error, connected, filters, setFilters, resetFilters, refetch, lastUpdated } = useSurveyData();
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.campus.length > 0 || filters.client_type.length > 0 ||
    filters.gender.length > 0 || !!filters.office_visited ||
    !!filters.service_availed || !!filters.dateFrom;

  // --- RESTRICTED ACCESS ---
  if (isRestricted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md p-10 bg-red-50 border border-red-200 rounded-2xl">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-800 mb-2">Restricted Access</h2>
          <p className="text-sm text-red-600">
            You do not have permission to view the CSS Dashboard. Only frontline offices and administrators can access this page.
          </p>
        </div>
      </div>
    );
  }

  const kpis = computeKPIs(filteredData);

  // --- LOADING ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#DD7230] rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading survey data…</p>
      </div>
    );
  }

  // --- ERROR ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-4xl">⚠️</p>
        <h3 className="text-base font-bold text-gray-800">Connection Error</h3>
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-[#DD7230] text-white text-xs font-semibold rounded-lg hover:bg-[#c4612a] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Survey Analytics</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Client Satisfaction Survey — {isGlobalAccess ? 'All Campuses & Offices' : `Scoped to ${userOffice}`}
            {lastUpdated && (
              <span className="ml-2 text-gray-400">
                · Updated {lastUpdated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {connected ? 'Live' : 'Offline'}
          </div>
          <span className="text-xs text-gray-500 font-medium">{filteredData.length.toLocaleString()} responses</span>
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <a
            href="https://ctu-client-satisfaction-survey.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#DD7230] text-white text-xs font-semibold rounded-lg hover:bg-[#c4612a] transition-colors shadow-2xs"
          >
            Open Survey
          </a>
        </div>
      </div>

      {/* Scoped Access Notice (only for non-global users) */}
      {isScopedAccess && (
        <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
          Your view is restricted to responses from <strong>{userOffice}</strong>.
        </div>
      )}

      {/* Tab Bar + Filter Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100">
          <div className="flex bg-gray-100 p-1 rounded-lg gap-0.5 overflow-x-auto">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shrink-0 cursor-pointer ${
              showFilters || hasActiveFilters
                ? 'bg-[#DD7230] text-white border-[#DD7230]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="bg-white/30 px-1 py-0.5 rounded text-[10px] font-bold leading-none">
                {[filters.campus, filters.client_type, filters.gender].flat().length +
                  (filters.office_visited ? 1 : 0) +
                  (filters.service_availed ? 1 : 0) +
                  (filters.dateFrom ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="border-b border-gray-100 p-4">
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              resetFilters={resetFilters}
              data={data}
              hideOfficeFilter={isScopedAccess}
            />
          </div>
        )}

        {/* Tab Content */}
        <div className="p-5 space-y-6">

          {/* KPI strip — always visible */}
          <KPICards kpis={kpis} filteredCount={filteredData.length} />

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <SectionLabel>Response Timeline</SectionLabel>
                <ChartCard title="Responses Over Time" subtitle="Daily submission count" fullWidth>
                  <ResponseTimeline data={filteredData} />
                </ChartCard>
              </div>
              <div>
                <SectionLabel>Quick Snapshot</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ChartCard title="Gender Distribution" subtitle="Respondent breakdown">
                    <GenderDonut data={filteredData} />
                  </ChartCard>
                  <ChartCard title="Campus Breakdown" subtitle="Responses per campus">
                    <CampusBar data={filteredData} />
                  </ChartCard>
                  <ChartCard title="Client Types" subtitle="Category of respondents">
                    <ClientTypeBar data={filteredData} />
                  </ChartCard>
                </div>
              </div>
              <div>
                <SectionLabel>SQD Performance Overview</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ChartCard
                    title="SQD Radar Chart"
                    subtitle="Average score per dimension (1–5 scale)"
                    badge={
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {kpis.avgSqdScore}/5 avg
                      </span>
                    }
                  >
                    <SQDRadar data={filteredData} />
                  </ChartCard>
                  <ChartCard title="SQD Score Breakdown" subtitle="Per-dimension average with rating">
                    <SQDScoreBars data={filteredData} />
                  </ChartCard>
                </div>
              </div>
            </div>
          )}

          {/* DEMOGRAPHICS */}
          {activeTab === 'demographics' && (
            <div className="space-y-6">
              <div>
                <SectionLabel>Respondent Demographics</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ChartCard
                    title="Gender Distribution"
                    subtitle="Breakdown by gender identity"
                    badge={
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                        {filteredData.length} total
                      </span>
                    }
                  >
                    <GenderDonut data={filteredData} />
                  </ChartCard>
                  <ChartCard title="Age Group Distribution" subtitle="Respondents grouped by age range">
                    <AgeGroupBar data={filteredData} />
                  </ChartCard>
                </div>
              </div>
              <div>
                <SectionLabel>Client Classification & Location</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ChartCard title="Client Type" subtitle="Individual, Business, or Government">
                    <ClientTypeBar data={filteredData} />
                  </ChartCard>
                  <ChartCard title="Campus Distribution" subtitle="Responses by campus location">
                    <CampusBar data={filteredData} />
                  </ChartCard>
                </div>
              </div>
            </div>
          )}

          {/* SERVICES & OFFICES */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div>
                <SectionLabel>Office Visits</SectionLabel>
                <div className="grid">
                  <ChartCard
                    title="Top Offices Visited"
                    subtitle="Ranked by number of survey responses"
                    badge={<span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">Top 10</span>}
                    fullWidth
                  >
                    <OfficesBar data={filteredData} topN={10} />
                  </ChartCard>
                </div>
              </div>
              <div>
                <SectionLabel>Services Availed</SectionLabel>
                <div className="grid">
                  <ChartCard
                    title="Top Services Availed"
                    subtitle="Most common transactions per respondent"
                    badge={<span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">Top 8</span>}
                    fullWidth
                  >
                    <ServicesBar data={filteredData} topN={8} />
                  </ChartCard>
                </div>
              </div>
            </div>
          )}

          {/* CITIZEN'S CHARTER */}
          {activeTab === 'charter' && (
            <div className="space-y-4">
              <SectionLabel>Citizen's Charter Awareness & Utility</SectionLabel>
              <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                The Citizen's Charter (CC) is an official document reflecting the services, requirements, fees, and processing times of government offices. These questions measure awareness and usefulness.
              </div>
              <div className="grid">
                <ChartCard
                  title="CC Response Distributions"
                  subtitle="CC1: Awareness · CC2: Visibility · CC3: Helpfulness"
                  fullWidth
                >
                  <CCCharts data={filteredData} />
                </ChartCard>
              </div>
            </div>
          )}

          {/* SQD */}
          {activeTab === 'sqd' && (
            <div className="space-y-4">
              <SectionLabel>Service Quality Dimensions (SQD0–SQD8)</SectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard
                  title="SQD Radar Overview"
                  subtitle="Average score per dimension on a 1–5 scale"
                  badge={
                    <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                      {kpis.satisfactionRate}% satisfied
                    </span>
                  }
                >
                  <SQDRadar data={filteredData} />
                </ChartCard>
                <ChartCard title="Per-Dimension Scores" subtitle="Average SQD score with performance ratings">
                  <SQDScoreBars data={filteredData} />
                </ChartCard>
              </div>
              <div className="grid">
                <ChartCard
                  title="SQD Response Distribution"
                  subtitle="Stacked bar: Likert scale answer breakdown per SQD item"
                  badge={
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {[
                        { label: 'Str. Agree', color: '#059669' },
                        { label: 'Agree', color: '#10B981' },
                        { label: 'Neutral', color: '#F59E0B' },
                        { label: 'Disagree', color: '#F97316' },
                        { label: 'Str. Disagree', color: '#EF4444' },
                      ].map((l) => (
                        <span
                          key={l.label}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: l.color, background: `${l.color}18`, border: `1px solid ${l.color}33` }}
                        >
                          {l.label}
                        </span>
                      ))}
                    </div>
                  }
                  fullWidth
                >
                  <SQDBar data={filteredData} />
                </ChartCard>
              </div>
            </div>
          )}

          {/* FEEDBACK */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <SectionLabel>Open-Ended Suggestions & Recommendations</SectionLabel>
              <ChartCard
                title="Client Suggestions"
                subtitle="Verbatim feedback from survey respondents"
                badge={
                  <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                    {filteredData.filter((r) => r.suggestions?.trim()).length} with feedback
                  </span>
                }
                fullWidth
              >
                <SuggestionsPanel data={filteredData} pageSize={8} />
              </ChartCard>
            </div>
          )}

          {/* RAW DATA */}
          {activeTab === 'table' && (
            <div className="space-y-4">
              <SectionLabel>Raw Survey Data</SectionLabel>
              <ChartCard
                title="All Responses"
                subtitle="Full dataset with sortable columns and CSV export"
                badge={
                  <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                    {filteredData.length} rows
                  </span>
                }
                fullWidth
              >
                <DataTable data={filteredData} pageSize={15} />
              </ChartCard>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-gray-400 pb-2">
        Powered by CTU Argao Quality Assurance & Knowledge System © {new Date().getFullYear()}
      </p>
    </div>
  );
};
