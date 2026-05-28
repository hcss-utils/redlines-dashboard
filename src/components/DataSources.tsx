import { useEffect, useMemo, useState } from 'react';

type Status = 'fresh' | 'lagging' | 'stale' | 'very_stale' | 'annual_ok' | 'manual';

type Row = {
  dataset: string;
  schema_table: string;
  category: string;
  latest_date: string | null;
  rows: number;
  expected_cadence: string;
  expected_max_lag_days: number | null;
  days_behind: number | null;
  status: Status;
  note: string;
};

type Snapshot = {
  as_of_utc: string;
  totals: Record<string, number>;
  rows: Row[];
};

const STATUS_META: Record<Status, { label: string; color: string; bg: string; order: number }> = {
  fresh:      { label: 'Fresh',       color: '#9ec5fe', bg: 'rgba(158,197,254,0.10)', order: 0 },
  lagging:    { label: 'Lagging',     color: '#ffd166', bg: 'rgba(255,209,102,0.10)', order: 1 },
  stale:      { label: 'Stale',       color: '#ff9f43', bg: 'rgba(255,159,67,0.12)',  order: 2 },
  very_stale: { label: 'Very stale',  color: '#f06464', bg: 'rgba(240,100,100,0.12)', order: 3 },
  annual_ok:  { label: 'Annual (OK)', color: '#9ec5fe', bg: 'rgba(158,197,254,0.06)', order: 4 },
  manual:     { label: 'Manual',      color: '#a0a0b0', bg: 'rgba(160,160,176,0.10)', order: 5 },
};

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: '0.78rem',
      fontWeight: 500,
      color: m.color,
      background: m.bg,
      border: `1px solid ${m.color}40`,
      borderRadius: '4px',
      whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
}

function fmtDays(d: number | null): string {
  if (d === null) return '—';
  if (d === 0) return 'today';
  if (d === 1) return '1d';
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.round(d / 30.4)}mo`;
  return `${(d / 365.25).toFixed(1)}y`;
}

function fmtRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const CATEGORY_ORDER = [
  'annotations', 'global_events', 'conflict_events', 'equipment_losses',
  'aerial_assaults', 'economic_data', 'humanitarian', 'casualties', 'territorial_control',
];

const CATEGORY_LABEL: Record<string, string> = {
  annotations: 'Annotations (RuBase)',
  global_events: 'Global events (GDELT)',
  conflict_events: 'Conflict events',
  equipment_losses: 'Equipment & personnel losses',
  aerial_assaults: 'Aerial assaults',
  economic_data: 'Economic & sanctions',
  humanitarian: 'Humanitarian',
  casualties: 'Casualties',
  territorial_control: 'Territorial control',
};

export default function DataSources() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL ?? '/';
    fetch(`${base}data/dataset_freshness.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setSnap)
      .catch(e => setErr(String(e)));
  }, []);

  const grouped = useMemo(() => {
    if (!snap) return [] as { category: string; rows: Row[] }[];
    const byCat = new Map<string, Row[]>();
    for (const r of snap.rows) {
      if (!byCat.has(r.category)) byCat.set(r.category, []);
      byCat.get(r.category)!.push(r);
    }
    const order = (c: string) => {
      const i = CATEGORY_ORDER.indexOf(c);
      return i < 0 ? CATEGORY_ORDER.length : i;
    };
    return Array.from(byCat.entries())
      .sort((a, b) => order(a[0]) - order(b[0]))
      .map(([category, rows]) => ({
        category,
        rows: rows.sort((a, b) => STATUS_META[a.status].order - STATUS_META[b.status].order
                                || a.dataset.localeCompare(b.dataset)),
      }));
  }, [snap]);

  if (err) return <div className="tab-content"><div style={{ padding: '2rem', color: '#f06464' }}>Failed to load dataset_freshness.json: {err}</div></div>;
  if (!snap) return <div className="tab-content"><div style={{ padding: '2rem', color: '#9ec5fe' }}>Loading dataset freshness…</div></div>;

  const totalRows = snap.rows.reduce((s, r) => s + r.rows, 0);
  const asOfLocal = new Date(snap.as_of_utc).toUTCString().replace(/:\d{2} GMT$/, ' UTC');

  return (
    <div className="tab-content">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem', color: '#e0e0e0' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '0.25rem', color: '#dbad51', fontSize: '1.6rem' }}>
            Data Sources & Freshness
          </h2>
          <p style={{ color: '#9aa0b0', fontSize: '0.9rem', margin: 0 }}>
            Snapshot of every external dataset the Causal Analytics consumes — latest record date,
            row count, and freshness vs. expected cadence. Refreshed nightly by the VPS pipeline.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <div style={statCard}><div style={statLabel}>As-of (UTC)</div><div style={statVal}>{asOfLocal}</div></div>
          <div style={statCard}><div style={statLabel}>Datasets tracked</div><div style={statVal}>{snap.rows.length}</div></div>
          <div style={statCard}><div style={statLabel}>Total rows</div><div style={statVal}>{fmtRows(totalRows)}</div></div>
          {(['fresh', 'lagging', 'stale', 'very_stale', 'manual'] as Status[]).map(s => snap.totals[s] ? (
            <div key={s} style={statCard}>
              <div style={statLabel}>{STATUS_META[s].label}</div>
              <div style={{ ...statVal, color: STATUS_META[s].color }}>{snap.totals[s]}</div>
            </div>
          ) : null)}
        </div>

        {grouped.map(({ category, rows }) => (
          <section key={category} style={{ marginBottom: '2rem' }}>
            <h3 style={{
              color: '#dbad51',
              fontSize: '1.05rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              borderBottom: '1px solid rgba(219,173,81,0.2)',
              paddingBottom: '0.3rem',
            }}>
              {CATEGORY_LABEL[category] ?? category}
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.88rem',
              }}>
                <thead>
                  <tr style={{ color: '#9aa0b0', fontWeight: 400, textAlign: 'left' }}>
                    <th style={thStyle}>Dataset</th>
                    <th style={thStyle}>Latest</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Days behind</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Rows</th>
                    <th style={thStyle}>Cadence</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.schema_table} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={tdStyle}>
                        <div>{r.dataset}</div>
                        <div style={{ fontSize: '0.72rem', color: '#7a8090', fontFamily: 'monospace' }}>
                          {r.schema_table}
                        </div>
                      </td>
                      <td style={tdStyle}>{r.latest_date ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: r.days_behind && r.expected_max_lag_days && r.days_behind > r.expected_max_lag_days ? STATUS_META[r.status].color : '#e0e0e0' }}>
                        {fmtDays(r.days_behind)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtRows(r.rows)}
                      </td>
                      <td style={{ ...tdStyle, color: '#9aa0b0' }}>{r.expected_cadence}</td>
                      <td style={tdStyle}><StatusBadge status={r.status} /></td>
                      <td style={{ ...tdStyle, color: '#9aa0b0', fontSize: '0.82rem' }}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          fontSize: '0.82rem',
          color: '#9aa0b0',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '6px',
        }}>
          <div style={{ marginBottom: '0.5rem', color: '#dbad51' }}>How freshness is computed</div>
          <div>
            Each dataset's <em>latest_date</em> is <code>MAX(date_column)</code> on its underlying table.
            <em> Days behind</em> = today (UTC) − latest_date. Status thresholds: <strong>Fresh</strong> ≤ expected_max_lag,
            <strong> Lagging</strong> ≤ 2× expected, <strong>Stale</strong> ≤ 5× expected,
            <strong> Very stale</strong> beyond that. <strong>Manual</strong> = no automated updater (e.g. Bruegel — Cloudflare-blocked).
            Snapshot regenerated by <code>scripts/export_dataset_freshness.py</code> on every VPS pipeline run (04:00 UTC nightly).
            See <code>Datasets/DATASET_UPDATE_SCHEDULE.md</code> in the project root for the per-updater cron schedule.
          </div>
        </div>
      </div>
    </div>
  );
}

const statCard: React.CSSProperties = {
  padding: '0.75rem 1rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '6px',
};
const statLabel: React.CSSProperties = { fontSize: '0.78rem', color: '#9aa0b0', marginBottom: '0.25rem' };
const statVal: React.CSSProperties = { fontSize: '1.1rem', color: '#e0e0e0', fontWeight: 500 };
const thStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', fontWeight: 400, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', verticalAlign: 'top' };
