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
import type { RRLSStatement, NTSStatement } from '../types';

const PAGE_SIZE = 15;

export default function OverlapExplorer() {
  const [rrls, setRrls] = useState<RRLSStatement[]>([]);
  const [nts, setNts] = useState<NTSStatement[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    load<RRLSStatement[]>('rrls_statements.json').then(setRrls);
    load<NTSStatement[]>('nts_statements.json').then(setNts);
  }, []);

  // Build chunk_id sets
  const rrlsChunks = useMemo(() => new Set(rrls.map(s => s.chunk_id)), [rrls]);
  const ntsChunks = useMemo(() => new Set(nts.map(s => s.chunk_id)), [nts]);
  const overlapChunks = useMemo(() => {
    const s = new Set<number>();
    for (const id of rrlsChunks) {
      if (ntsChunks.has(id)) s.add(id);
    }
    return s;
  }, [rrlsChunks, ntsChunks]);

  // Build joined overlap records
  const overlapRecords = useMemo(() => {
    const ntsMap = new Map<number, NTSStatement>();
    for (const s of nts) ntsMap.set(s.chunk_id, s);
    return rrls
      .filter(s => overlapChunks.has(s.chunk_id))
      .map(r => ({ rrls: r, nts: ntsMap.get(r.chunk_id)! }));
  }, [rrls, nts, overlapChunks]);

  const dateBounds = useMemo(() => {
    let min = '', max = '';
    for (const { rrls: r } of overlapRecords) {
      if (!r.date) continue;
      if (!min || r.date < min) min = r.date;
      if (!max || r.date > max) max = r.date;
    }
    return { min, max };
  }, [overlapRecords]);

  // Apply filters
  const filtered = useMemo(() => {
    let d = overlapRecords;
    if (sourceFilter !== 'all') d = d.filter(r => matchesSource(r.rrls.source, r.rrls.db, sourceFilter));
    if (startDate) d = d.filter(r => r.rrls.date >= startDate);
    if (endDate) d = d.filter(r => r.rrls.date <= endDate);
    return d;
  }, [overlapRecords, sourceFilter, startDate, endDate]);

  // Stats
  const totalRRLS = rrls.length;
  const totalNTS = nts.length;
  const overlapCount = filtered.length;
  const rrlsOnly = totalRRLS - overlapChunks.size;
  const ntsOnly = totalNTS - overlapChunks.size;
  const overlapPct = totalRRLS > 0 ? ((overlapChunks.size / totalRRLS) * 100).toFixed(1) : '0';

  // Monthly overlap
  const monthlyOverlap = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const { rrls: r } of filtered) {
      if (!r.date) continue;
      const m = r.date.slice(0, 7);
      agg[m] = (agg[m] || 0) + 1;
    }
    const months = Object.keys(agg).sort();
    return { months, counts: months.map(m => agg[m]) };
  }, [filtered]);

  // NTS Tone distribution
  const toneDist = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const { nts: n } of filtered) {
      if (n?.tone) agg[n.tone] = (agg[n.tone] || 0) + 1;
    }
    return Object.entries(agg).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // RRLS Theme distribution (top 10)
  const themeDist = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const { rrls: r } of filtered) {
      if (r.theme) agg[r.theme] = (agg[r.theme] || 0) + 1;
    }
    return Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  // NTS Purpose distribution
  const purposeDist = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const { nts: n } of filtered) {
      if (n?.purpose) agg[n.purpose] = (agg[n.purpose] || 0) + 1;
    }
    return Object.entries(agg).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Pagination
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
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#d32f2f' }}>{totalRRLS.toLocaleString()}</div>
          <div className="stat-label">Total RRLS</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#fdd835' }}>{totalNTS.toLocaleString()}</div>
          <div className="stat-label">Total NTS</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#e91e63' }}>{overlapChunks.size.toLocaleString()}</div>
          <div className="stat-label">Overlap</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rrlsOnly.toLocaleString()}</div>
          <div className="stat-label">RRLS-Only</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{ntsOnly.toLocaleString()}</div>
          <div className="stat-label">NTS-Only</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#e91e63' }}>{overlapPct}%</div>
          <div className="stat-label">Overlap %</div>
        </div>
      </div>

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

      {/* Monthly overlap bar chart */}
      {monthlyOverlap.months.length > 0 && (
        <div className="chart-row">
          <div className="chart-box">
            <div className="chart-title-bar">
              <h4>Monthly Overlap Count</h4>
              <ChartInfo
                title="Monthly Overlap Count"
                description="Bar chart showing the number of chunks classified as both RRLS and NTS per month. Spikes indicate periods of combined red-line + nuclear rhetoric."
              />
            </div>
            <Plot
              data={[{
                type: 'bar',
                x: monthlyOverlap.months,
                y: monthlyOverlap.counts,
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
        {toneDist.length > 0 && (
          <div className="chart-box">
            <div className="chart-title-bar">
              <h4>NTS Tone Distribution</h4>
              <ChartInfo
                title="NTS Tone Distribution"
                description="Distribution of NTS tone values among overlap statements."
              />
            </div>
            <Plot
              data={[{
                type: 'bar',
                x: toneDist.map(([v]) => v),
                y: toneDist.map(([, c]) => c),
                marker: { color: '#fdd835' },
                text: toneDist.map(([, c]) => c.toString()),
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

        {themeDist.length > 0 && (
          <div className="chart-box">
            <div className="chart-title-bar">
              <h4>RRLS Theme (Top 10)</h4>
              <ChartInfo
                title="RRLS Theme Distribution"
                description="Top 10 RRLS themes among overlap statements."
              />
            </div>
            <Plot
              data={[{
                type: 'bar',
                orientation: 'h',
                x: themeDist.map(([, c]) => c),
                y: themeDist.map(([v]) => v),
                marker: { color: '#d32f2f' },
                text: themeDist.map(([, c]) => c.toString()),
                textposition: 'outside',
              }]}
              layout={{
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                font: { color: '#e0e0e0' },
                margin: { t: 10, b: 20, l: 200, r: 60 },
                height: Math.max(250, themeDist.length * 28),
                yaxis: { autorange: 'reversed' },
                xaxis: { title: 'Count' },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {purposeDist.length > 0 && (
        <div className="chart-row">
          <div className="chart-box">
            <div className="chart-title-bar">
              <h4>NTS Purpose Distribution</h4>
              <ChartInfo
                title="NTS Purpose Distribution"
                description="Distribution of NTS purpose values among overlap statements."
              />
            </div>
            <Plot
              data={[{
                type: 'bar',
                x: purposeDist.map(([v]) => v),
                y: purposeDist.map(([, c]) => c),
                marker: { color: '#fdd835' },
                text: purposeDist.map(([, c]) => c.toString()),
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
              description="Browse chunks that are classified as both RRLS and NTS. Tags from both layers are shown: red for RRLS dimensions, yellow for NTS dimensions."
            />
          </div>

          <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '8px' }}>
            {filtered.length} overlap statement{filtered.length !== 1 ? 's' : ''}
          </div>

          <div className="stmt-list">
            {pageData.map(({ rrls: r, nts: n }, i) => (
              <div key={`${r.chunk_id}-${i}`} className="stmt-card">
                <div className="stmt-meta">
                  <span className="stmt-date">{r.date || 'No date'}</span>
                  <span className="stmt-source">{r.source}</span>
                  <span className="stmt-db">{r.db}</span>
                  {r.overall_confidence && (
                    <span className="stmt-db" style={confidencePillStyle(r.overall_confidence)}>
                      RRLS Conf: {r.overall_confidence}/10
                    </span>
                  )}
                  {n?.overall_confidence && (
                    <span className="stmt-db" style={confidencePillStyle(n.overall_confidence)}>
                      NTS Conf: {n.overall_confidence}/10
                    </span>
                  )}
                  {r.speaker && <span className="stmt-speaker">Speaker: {r.speaker}</span>}
                  {r.target && <span className="stmt-target">Target: {r.target}</span>}
                </div>
                <div className="stmt-text">{r.context_text_span || '(no text)'}</div>
                <div className="stmt-tags">
                  {/* All RRLS annotations (red) */}
                  {RRLS_FILTERS.map(f => {
                    const val = (r as unknown as Record<string, unknown>)[f.key] as string | undefined;
                    if (!val) return null;
                    const c = fieldColor(f.key);
                    return (
                      <span key={`rrls-${f.key}`} className="tag" style={{ background: `${c}2a`, color: c, borderLeft: `3px solid ${c}` }}>
                        {f.label}: {val}
                      </span>
                    );
                  })}
                  {/* All NTS annotations (yellow) */}
                  {n && NTS_FILTERS.map(f => {
                    const val = (n as unknown as Record<string, unknown>)[f.key] as string | undefined;
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
                No overlap statements found.
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
