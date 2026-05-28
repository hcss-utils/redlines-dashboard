import { useEffect, useState, useMemo } from 'react';
import Plot from './Plot';
import { load } from '../data';
import ChartInfo from './ChartInfo';
import DateRangeFilter from './DateRangeFilter';
import { SOURCE_OPTIONS, matchesSource } from '../sourceFilter';
import type { SourceFilterValue } from '../sourceFilter';
import { RRLS_FILTERS, NTS_FILTERS } from '../filterDefs';
import { fieldColor } from '../filterColors';
import { confidencePillStyle } from '../confidence';
import type { MonthlyRow } from '../types';

// Pre-computed overlap record (from mv_overlap via export)
interface OverlapRecord {
  chunk_id: number;
  date: string;
  source: string;
  db: string;
  context_text_span: string;
  speaker: string;
  target: string;
  // RRLS fields
  line_type: string;
  rrls_threat_type: string;
  line_intensity: string;
  threat_intensity: string;
  theme: string;
  rrls_audience: string;
  nature_of_threat: string;
  level_of_escalation: string;
  geopolitical_area_of_concern: string;
  immediacy: string;
  durability: string;
  reciprocity: string;
  rrls_specificity: string;
  temporal_context: string;
  underlying_values_or_interests: string;
  unilateral_vs_multilateral: string;
  rrls_rhetorical_device: string;
  rrls_confidence: number;
  // NTS fields
  nts_statement_type: string;
  nts_threat_type: string;
  capability: string;
  delivery_system: string;
  conditionality: string;
  purpose: string;
  tone: string;
  context: string;
  geographical_reach: string;
  consequences: string;
  timeline: string;
  nts_audience: string;
  nts_specificity: string;
  nts_rhetorical_device: string;
  arms_control_and_testing: string;
  nts_confidence: number;
}

interface OverlapStats {
  total_rrls: number;
  total_nts: number;
  overlap: number;
  rrls_only: number;
  nts_only: number;
}

interface ValueCount {
  value: string;
  count: number;
}

const PAGE_SIZE = 15;

// Map overlap record fields to RRLS filter keys (field names differ in the matview)
const RRLS_FIELD_MAP: Record<string, string> = {
  threat_type: 'rrls_threat_type',
  audience: 'rrls_audience',
  specificity: 'rrls_specificity',
  rhetorical_device: 'rrls_rhetorical_device',
};
const NTS_FIELD_MAP: Record<string, string> = {
  audience: 'nts_audience',
  specificity: 'nts_specificity',
  rhetorical_device: 'nts_rhetorical_device',
};

export default function OverlapExplorer() {
  const [records, setRecords] = useState<OverlapRecord[]>([]);
  const [stats, setStats] = useState<OverlapStats | null>(null);
  const [monthlyPre, setMonthlyPre] = useState<MonthlyRow[]>([]);
  const [tonePre, setTonePre] = useState<ValueCount[]>([]);
  const [themePre, setThemePre] = useState<ValueCount[]>([]);
  const [purposePre, setPurposePre] = useState<ValueCount[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    load<OverlapRecord[]>('overlap_statements.json').then(setRecords);
    load<OverlapStats>('overlap_stats.json').then(setStats);
    load<MonthlyRow[]>('overlap_monthly.json').then(setMonthlyPre);
    load<ValueCount[]>('overlap_by_tone.json').then(setTonePre);
    load<ValueCount[]>('overlap_by_theme.json').then(setThemePre);
    load<ValueCount[]>('overlap_by_purpose.json').then(setPurposePre);
  }, []);

  const isFiltered = sourceFilter !== 'all' || !!startDate || !!endDate;

  const dateBounds = useMemo(() => {
    if (!records.length) return { min: '', max: '' };
    const dates = records.map(r => r.date).filter(Boolean).sort();
    return { min: dates[0] || '', max: dates[dates.length - 1] || '' };
  }, [records]);

  // Apply filters
  const filtered = useMemo(() => {
    let d = records;
    if (sourceFilter !== 'all') d = d.filter(r => matchesSource(r.source, r.db, sourceFilter));
    if (startDate) d = d.filter(r => r.date >= startDate);
    if (endDate) d = d.filter(r => r.date <= endDate);
    return d;
  }, [records, sourceFilter, startDate, endDate]);

  // Use pre-computed data when unfiltered, recompute when filtered
  const monthlyData = useMemo(() => {
    if (!isFiltered) return monthlyPre.map(r => ({ month: r.month, count: r.count }));
    const agg: Record<string, number> = {};
    for (const r of filtered) {
      if (!r.date) continue;
      const m = r.date.slice(0, 7);
      agg[m] = (agg[m] || 0) + 1;
    }
    return Object.entries(agg).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
  }, [isFiltered, monthlyPre, filtered]);

  const toneData = useMemo(() => {
    if (!isFiltered) return tonePre;
    const agg: Record<string, number> = {};
    for (const r of filtered) if (r.tone) agg[r.tone] = (agg[r.tone] || 0) + 1;
    return Object.entries(agg).sort(([, a], [, b]) => b - a).map(([value, count]) => ({ value, count }));
  }, [isFiltered, tonePre, filtered]);

  const themeData = useMemo(() => {
    if (!isFiltered) return themePre;
    const agg: Record<string, number> = {};
    for (const r of filtered) if (r.theme) agg[r.theme] = (agg[r.theme] || 0) + 1;
    return Object.entries(agg).sort(([, a], [, b]) => b - a).map(([value, count]) => ({ value, count }));
  }, [isFiltered, themePre, filtered]);

  const purposeData = useMemo(() => {
    if (!isFiltered) return purposePre;
    const agg: Record<string, number> = {};
    for (const r of filtered) if (r.purpose) agg[r.purpose] = (agg[r.purpose] || 0) + 1;
    return Object.entries(agg).sort(([, a], [, b]) => b - a).map(([value, count]) => ({ value, count }));
  }, [isFiltered, purposePre, filtered]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => setPage(0), [sourceFilter, startDate, endDate]);

  return (
    <div className="tab-content">
      <h2 style={{ color: '#e91e63' }}>RRLS {'\u2229'} NTS Overlap Explorer</h2>
      <p className="subtitle">
        Chunks classified as both RRLS (red line statements) and NTS (nuclear threat statements) — the most escalatory subset.
      </p>

      {/* Stat cards */}
      {stats && (
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#d32f2f' }}>{stats.total_rrls.toLocaleString()}</div>
            <div className="stat-label">Total RRLS</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#fdd835' }}>{stats.total_nts.toLocaleString()}</div>
            <div className="stat-label">Total NTS</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#e91e63' }}>{stats.overlap.toLocaleString()}</div>
            <div className="stat-label">Overlap</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.rrls_only.toLocaleString()}</div>
            <div className="stat-label">RRLS-Only</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.nts_only.toLocaleString()}</div>
            <div className="stat-label">NTS-Only</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#e91e63' }}>
              {stats.total_nts > 0 ? ((stats.overlap / stats.total_nts) * 100).toFixed(1) + '%' : '—'}
            </div>
            <div className="stat-label">NTS that are also RRLS</div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        <select
          className="source-select"
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value as SourceFilterValue)}
        >
          {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <DateRangeFilter
          startDate={startDate} endDate={endDate}
          onStartChange={setStartDate} onEndChange={setEndDate}
          min={dateBounds.min} max={dateBounds.max}
        />
        <span className="result-count">{filtered.length.toLocaleString()} overlap statements</span>
      </div>

      {/* Monthly overlap chart */}
      {monthlyData.length > 0 && (
        <div className="chart-row">
          <div className="chart-box">
            <div className="chart-title-bar">
              <h4>Monthly Overlap Count</h4>
              <ChartInfo
                title="Monthly Overlap Count"
                description="Bar chart showing the number of chunks classified as both RRLS and NTS per month."
              />
            </div>
            <Plot
              data={[{
                type: 'bar',
                x: monthlyData.map(r => r.month),
                y: monthlyData.map(r => r.count),
                marker: { color: '#e91e63' },
              }]}
              layout={{
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                font: { color: '#e0e0e0' },
                margin: { t: 10, b: 40, l: 60, r: 20 },
                height: 300,
                xaxis: { title: 'Month' },
                yaxis: { title: 'Overlap Count' },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Distribution charts */}
      <div className="chart-row">
        {toneData.length > 0 && (
          <div className="chart-box">
            <div className="chart-title-bar">
              <h4>NTS Tone Distribution</h4>
              <ChartInfo title="NTS Tone" description="Tone distribution among overlap statements." />
            </div>
            <Plot
              data={[{
                type: 'bar',
                x: toneData.map(r => r.value),
                y: toneData.map(r => r.count),
                marker: { color: '#fdd835' },
                text: toneData.map(r => r.count.toString()),
                textposition: 'outside',
              }]}
              layout={{
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                font: { color: '#e0e0e0' },
                margin: { t: 10, b: 80, l: 60, r: 20 },
                height: 300,
                xaxis: { tickangle: -45 },
                yaxis: { title: 'Count' },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {themeData.length > 0 && (
          <div className="chart-box">
            <div className="chart-title-bar">
              <h4>RRLS Theme (Top 10)</h4>
              <ChartInfo title="RRLS Theme" description="Theme distribution among overlap statements." />
            </div>
            <Plot
              data={[{
                type: 'bar',
                orientation: 'h',
                x: themeData.slice(0, 10).map(r => r.count),
                y: themeData.slice(0, 10).map(r => r.value),
                marker: { color: '#d32f2f' },
                text: themeData.slice(0, 10).map(r => r.count.toString()),
                textposition: 'outside',
              }]}
              layout={{
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                font: { color: '#e0e0e0' },
                margin: { t: 10, b: 20, l: 200, r: 60 },
                height: Math.max(250, themeData.slice(0, 10).length * 28),
                yaxis: { autorange: 'reversed' },
                xaxis: { title: 'Count' },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {purposeData.length > 0 && (
        <div className="chart-row">
          <div className="chart-box">
            <div className="chart-title-bar">
              <h4>NTS Purpose Distribution</h4>
              <ChartInfo title="NTS Purpose" description="Purpose distribution among overlap statements." />
            </div>
            <Plot
              data={[{
                type: 'bar',
                x: purposeData.map(r => r.value),
                y: purposeData.map(r => r.count),
                marker: { color: '#fdd835' },
                text: purposeData.map(r => r.count.toString()),
                textposition: 'outside',
              }]}
              layout={{
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                font: { color: '#e0e0e0' },
                margin: { t: 10, b: 100, l: 60, r: 20 },
                height: 300,
                xaxis: { tickangle: -45 },
                yaxis: { title: 'Count' },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Statement browser */}
      <div className="chart-row">
        <div className="chart-box" style={{ minWidth: '100%' }}>
          <div className="chart-title-bar">
            <h4>Overlap Statements</h4>
            <ChartInfo
              title="Overlap Statement Browser"
              description="Browse chunks classified as both RRLS and NTS. Red tags = RRLS dimensions, yellow tags = NTS dimensions."
            />
          </div>

          <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '8px' }}>
            {filtered.length} overlap statement{filtered.length !== 1 ? 's' : ''}
          </div>

          <div className="stmt-list">
            {pageData.map((r, i) => (
              <div key={`${r.chunk_id}-${i}`} className="stmt-card">
                <div className="stmt-meta">
                  <span className="stmt-date">{r.date || 'No date'}</span>
                  <span className="stmt-source">{r.source}</span>
                  <span className="stmt-db">{r.db}</span>
                  {r.rrls_confidence && (
                    <span className="stmt-db" style={confidencePillStyle(r.rrls_confidence)}>
                      RRLS: {r.rrls_confidence}/10
                    </span>
                  )}
                  {r.nts_confidence && (
                    <span className="stmt-db" style={confidencePillStyle(r.nts_confidence)}>
                      NTS: {r.nts_confidence}/10
                    </span>
                  )}
                  {r.speaker && <span className="stmt-speaker">Speaker: {r.speaker}</span>}
                  {r.target && <span className="stmt-target">Target: {r.target}</span>}
                </div>
                <div className="stmt-text">{r.context_text_span || '(no text)'}</div>
                <div className="stmt-tags">
                  {/* All RRLS annotations (per-field color) */}
                  {RRLS_FILTERS.map(f => {
                    const field = RRLS_FIELD_MAP[f.key] || f.key;
                    const val = (r as unknown as Record<string, unknown>)[field] as string | undefined;
                    if (!val) return null;
                    const c = fieldColor(f.key);
                    return (
                      <span key={`rrls-${f.key}`} className="tag" style={{ background: `${c}2a`, color: c, borderLeft: `3px solid ${c}` }}>
                        {f.label}: {val}
                      </span>
                    );
                  })}
                  {/* All NTS annotations (yellow) */}
                  {NTS_FILTERS.map(f => {
                    const field = NTS_FIELD_MAP[f.key] || f.key;
                    const val = (r as unknown as Record<string, unknown>)[field] as string | undefined;
                    if (!val) return null;
                    const c = '#fdd835';
                    return (
                      <span key={`nts-${f.key}`} className="tag" style={{ background: 'rgba(253,216,53,0.17)', color: c, borderLeft: `3px solid ${c}` }}>
                        {'\u2622'} {f.label}: {val}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
            {pageData.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#556' }}>
                {records.length === 0 ? 'Loading...' : 'No overlap statements found.'}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span>Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
