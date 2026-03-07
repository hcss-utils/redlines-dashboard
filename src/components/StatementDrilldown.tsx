import { RRLS_COLORS, NTS_COLORS, getDimValueColor } from '../colors';
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

  const tag = (dim: string, val: string | undefined, label?: string) => {
    if (!val) return null;
    const c = getDimValueColor(COLORS, dim, val, 0);
    return <span key={dim} className="tag" style={{ background: `${c}33`, color: c }}>{label ? `${label}: ${val}` : val}</span>;
  };

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
                {stmt.overall_confidence && <span className="stmt-db">Conf: {stmt.overall_confidence}/10</span>}
                {stmt.speaker && <span className="stmt-speaker">Speaker: {stmt.speaker}</span>}
                {stmt.target && <span className="stmt-target">Target: {stmt.target}</span>}
              </div>
              <div className="stmt-text">{stmt.context_text_span || '(no text)'}</div>
              {mode === 'rrls' && (() => {
                const s = stmt as RRLSStatement;
                return (
                  <div className="stmt-tags">
                    {tag('theme', s.theme)}
                    {tag('audience', s.audience)}
                    {tag('nature_of_threat', s.nature_of_threat)}
                    {tag('level_of_escalation', s.level_of_escalation)}
                    {tag('line', s.line_type, 'Line')}
                    {tag('threat', s.threat_type, 'Threat')}
                    {tag('specificity', s.specificity)}
                    {tag('immediacy', s.immediacy)}
                  </div>
                );
              })()}
              {mode === 'nts' && (() => {
                const s = stmt as NTSStatement;
                return (
                  <div className="stmt-tags">
                    {tag('nts_statement_type', s.nts_statement_type)}
                    {tag('nts_threat_type', s.nts_threat_type)}
                    {tag('capability', s.capability)}
                    {tag('tone', s.tone, 'Tone')}
                    {tag('consequences', s.consequences, 'Consequences')}
                    {tag('specificity', s.specificity)}
                    {tag('conditionality', s.conditionality)}
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
