import { RRLS_COLORS, NTS_COLORS, getDimValueColor } from '../colors';
import { confidencePillStyle } from '../confidence';
import { RRLS_FILTERS, NTS_FILTERS, COLOR_KEY_FOR } from '../filterDefs';
import type { RRLSStatement, NTSStatement } from '../types';

interface DrilldownProps {
  mode: 'rrls' | 'nts';
  title: string;
  statements: (RRLSStatement | NTSStatement)[];
  onClose: () => void;
}

export default function StatementDrilldown({ mode, title, statements, onClose }: DrilldownProps) {
  const shown = statements.slice(0, 50);
  const COLORS = mode === 'rrls' ? RRLS_COLORS : NTS_COLORS;
  const filterDefs = mode === 'rrls' ? RRLS_FILTERS : NTS_FILTERS;

  return (
    <div className="drilldown-overlay" onClick={onClose}>
      <div className="drilldown-modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="drilldown-subtitle">
          {statements.length} matching statement{statements.length !== 1 ? 's' : ''}
          {statements.length > 50 ? ' (showing first 50)' : ''}
        </p>

        <div className="stmt-list">
          {shown.map((stmt, i) => (
            <div key={`${stmt.chunk_id}-${i}`} className="stmt-card">
              <div className="stmt-meta">
                <span className="stmt-date">{stmt.date || 'No date'}</span>
                <span className="stmt-source">{stmt.source}</span>
                <span className="stmt-db">{stmt.db}</span>
                {stmt.overall_confidence && (
                  <span className="stmt-db" style={confidencePillStyle(stmt.overall_confidence)}>
                    Conf: {stmt.overall_confidence}/10
                  </span>
                )}
                {stmt.speaker && <span className="stmt-speaker">Speaker: {stmt.speaker}</span>}
                {stmt.target && <span className="stmt-target">Target: {stmt.target}</span>}
              </div>
              <div className="stmt-text">{stmt.context_text_span || '(no text)'}</div>
              {(() => {
                const s = stmt as unknown as Record<string, unknown>;
                return (
                  <div className="stmt-tags">
                    {filterDefs.map(f => {
                      const val = s[f.key] as string | undefined;
                      if (!val) return null;
                      const c = getDimValueColor(COLORS, COLOR_KEY_FOR(f.key), val, 0);
                      return (
                        <span key={f.key} className="tag" style={{ background: `${c}33`, color: c }}>
                          {f.label}: {val}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        <button className="drilldown-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
