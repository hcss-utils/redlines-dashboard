import { useEffect, useState } from 'react';
import { load } from '../data';
import type { OverviewStats } from '../types';

const GOLD = '#dbad51', RED = '#d32f2f', NUKE = '#fdd835';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="about-section">
      <h3 style={{ color: GOLD, borderBottom: '1px solid rgba(219,173,81,0.3)', paddingBottom: 6 }}>{title}</h3>
      {children}
    </div>
  );
}

export default function About() {
  const [s, setS] = useState<OverviewStats | null>(null);
  useEffect(() => { load<OverviewStats>('overview_stats.json').then(setS); }, []);
  const n = (v?: number) => (v ?? 0).toLocaleString();

  return (
    <div className="tab-content about-tab">
      {/* Hero */}
      <div className="about-hero">
        <h2 style={{ marginBottom: 4 }}>Russian Red Lines</h2>
        <p style={{ fontSize: 15, color: '#c7cad6', maxWidth: 880, lineHeight: 1.55 }}>
          A systematic empirical study of how Russia talks about its "red lines" and nuclear threats across the
          war in Ukraine – and a test of a question that has shaped Western policy: <strong>is that rhetoric driven
          by the physical war, or is it a deliberate signaling instrument Moscow controls?</strong> This dashboard
          is the annotation-and-analysis layer; two sister dashboards carry the strategic context and the causal engine.
        </p>
      </div>

      {/* Live headline numbers */}
      <div className="stat-cards" style={{ marginTop: 18 }}>
        <div className="stat-card"><div className="stat-val">{s ? n(s.total_docs) : ' –'}</div><div className="stat-label">Documents (1999–2025)</div></div>
        <div className="stat-card"><div className="stat-val">{s ? n(s.total_chunks) : ' –'}</div><div className="stat-label">Text chunks</div></div>
        <div className="stat-card" style={{ borderColor: RED }}><div className="stat-val">{s ? n(s.rls2_confirmed) : ' –'}</div><div className="stat-label">Confirmed red-line statements</div></div>
        <div className="stat-card" style={{ borderColor: NUKE }}><div className="stat-val">{s ? n(s.nts2_confirmed) : ' –'}</div><div className="stat-label">☢ Nuclear-threat statements</div></div>
        <div className="stat-card"><div className="stat-val">{s ? n(s.total_sources) : ' –'}</div><div className="stat-label">Official Russian sources</div></div>
      </div>

      <Section title="The question, and the finding">
        <p>
          The implicit model behind much Western caution is an <em>escalation spiral</em>: Western weapons enable
          Ukrainian strikes; deeper strikes raise the stakes for Moscow; and rising stakes produce escalating Russian
          nuclear signaling read as a leading indicator of real escalation risk. We tested that model against four years
          of weekly data with six econometric methods and two graph-learning models.
        </p>
        <p>
          The answer is consistent: <strong style={{ color: GOLD }}>no systematic effect.</strong> No slice of the
          Ukrainian strike campaign robustly predicts Russian nuclear or red-line rhetoric – and neither does the war's
          human cost once it is measured cleanly. What the rhetoric tracks is Russia's <em>own</em> signaling calendar
          (doctrine revisions, weapon demonstrations, set-piece speeches). The defensible thesis:{' '}
          <strong>Russian nuclear rhetoric is a deliberate, episodic signaling instrument, decoupled from the physical
          war</strong> – loud when Moscow elects to signal, quiet even as the strikes intensify.
        </p>
        <p style={{ fontSize: 13, color: '#a9abb8' }}>
          Full write-up:{' '}
          <a href="https://rubase.org/assets/deliverables/strike_rhetoric_decoupling.pdf" target="_blank" rel="noreferrer" style={{ color: GOLD }}>
            The Strike–Rhetoric Decoupling</a> (RuBase Research Note, 35 pp). It is a finding about the probability of
          escalatory <em>signaling</em>, not nuclear <em>use</em> – the rare, high-consequence tail is a separate question no rhetoric analysis can settle.
        </p>
      </Section>

      <Section title="The data model">
        <p>From one corpus of official Russian communications, two complementary layers:</p>
        <ul>
          <li><strong style={{ color: RED }}>Statement annotations</strong> – every text chunk is screened and, if relevant,
            annotated: <strong>RLS → RRLS → CRLS</strong> (literal red-line statements → confirmed → civilizational framing),
            <strong> NTS</strong> (nuclear-threat statements, taxonomized by type, intensity, audience, purpose, conditionality),
            and <strong>LRLS</strong> (Putin's own literal red lines). Explore each in the tabs above.</li>
          <li><strong style={{ color: '#4fc3f7' }}>A temporal knowledge graph (TKG)</strong> – the same events as a sequence of
            weekly graphs (who did what to whom), including the <code>STRIKES</code> and human-cost <code>SUSTAINS_DEATHS</code>
            predicates. This feeds both a graph neural network and the multi-method causal battery behind the decoupling finding.</li>
        </ul>
      </Section>

      <Section title="Three dashboards, one project">
        <div className="about-cards">
          <div className="about-card" style={{ borderColor: GOLD }}>
            <h4>Red Lines <span className="about-here">you are here</span></h4>
            <p>The annotation pipelines (RRLS / NTS / CRLS / LRLS), the causal-analytics tab, GNN metrics, and data-source freshness.</p>
          </div>
          <a className="about-card" href="https://rubase.org/war-datasets-dashboard/" target="_blank" rel="noreferrer">
            <h4>War Datasets ↗</h4>
            <p>The strategic context: DeepState territory, equipment & personnel losses, named casualty data, ACLED, sanctions, energy.</p>
          </a>
          <a className="about-card" href="https://rubase.org/causal-dashboard/" target="_blank" rel="noreferrer">
            <h4>Causal Analysis ↗</h4>
            <p>The TKG → Granger engine: 226 weekly snapshots and the strike-decoupling battery (FAVAR / LASSO / Ridge / VARX).</p>
          </a>
        </div>
      </Section>

      <Section title="How it's built">
        <ul>
          <li><strong>Corpus.</strong> Official Russian government and parliamentary communications (1999–2025), de-duplicated and chunked into semantically coherent passages.</li>
          <li><strong>Annotation.</strong> A multi-pass LLM pipeline: a high-recall relevance screen, then a taxonomy pass scoring each confirmed statement across 15–18 dimensions with a confidence score, then a civilizational-framing pass – validated against a human-labelled gold set.</li>
          <li><strong>The graph & the model.</strong> Events become weekly snapshots of a temporal knowledge graph; a graph neural network (TransformerConv + ComplEx) learns its structure, in parallel with the time-series analysis.</li>
          <li><strong>Causal testing.</strong> An adversarial, multi-method battery – Granger/VAR, a factor-augmented FAVAR, LASSO/Ridge shrinkage, VARX with event dummies, plus the graph models – each a different way to <em>try to find</em> an effect, so a consistent null is hard to dismiss. Findings are stress-tested: read the underlying statements, control for confounders, and purify the measure before believing a result.</li>
          <li><strong>Currency & governance.</strong> The datasets refresh daily and the analytics are recomputed on a regular cadence; every public surface must pass an automated standards verifier and a visual review before it ships.</li>
        </ul>
        <p style={{ fontSize: 13, color: '#a9abb8' }}>
          Honest limits: Granger causality is predictive precedence, not proof of mechanism; the dependent variable is
          rhetoric, not action; and this is one war and one nuclear actor's signaling style. The analysis shifts where the
          burden of proof lies – it does not license complacency about the catastrophic tail.
        </p>
      </Section>

      <Section title="Outputs">
        <p>
          Papers, the slide decks and NotebookLM media, and these three dashboards are collected on the project's landing card:{' '}
          <a href="https://rubase.org/p/red-lines" target="_blank" rel="noreferrer" style={{ color: GOLD }}>rubase.org/p/red-lines</a>.
        </p>
      </Section>
    </div>
  );
}
