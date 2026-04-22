// Per-field color scheme for Statement Browser tag pills.
//
// Each annotated field maps to a single hex color, grouped into intuitive
// semantic families so the 15+ tag row on every card is scan-able by
// field at a glance.
//
// Families (rough mental model):
//   RED       — "line" (red in red lines) and "threat" (scary, violent)
//   ORANGE    — escalation, severity, warning
//   PURPLE    — rhetoric, speech, statement type
//   ROSE      — audience / who's being addressed
//   BLUE      — geography, spatial context
//   TEAL/CYAN — time, duration, immediacy
//   GREEN     — values, purpose, theme (what's being defended / discussed)
//   METALLIC  — weapons capability, delivery systems, arms control
//   NEUTRAL   — structure / meta (specificity, reciprocity, etc.)

export const FIELD_COLOR: Record<string, string> = {
  // Red — line + threat (the "red" in red lines + scary threats)
  line_type:           '#e53935',   // pure red
  line_intensity:      '#c62828',   // darker red
  threat_type:         '#8e0000',   // blood red
  threat_intensity:    '#b71c1c',   // crimson
  nts_threat_type:     '#8e0000',   // match threat_type

  // Orange/amber — nature of threat, escalation, tone, consequences
  nature_of_threat:    '#e65100',   // deep orange
  level_of_escalation: '#ff8f00',   // amber
  tone:                '#d84315',   // burnt orange (alarming speech)
  consequences:        '#bf360c',   // dark red-orange (outcomes)

  // Purple — rhetoric, statement type
  rhetorical_device:   '#8e24aa',   // purple
  nts_statement_type:  '#6a1b9a',   // deep purple

  // Rose — audience / target framing
  audience:            '#d81b60',   // rose

  // Blue — geography / spatial context
  geopolitical_area_of_concern: '#1976d2',  // blue
  geographical_reach:  '#0d47a1',   // navy
  context:             '#455a64',   // steel blue-gray

  // Teal / cyan — time
  temporal_context:    '#00897b',   // teal
  timeline:            '#00acc1',   // cyan
  immediacy:           '#0097a7',   // darker cyan
  durability:          '#5d4037',   // brown (permanence)

  // Green — theme / values / purpose
  theme:               '#00796b',   // teal-green
  underlying_values_or_interests: '#2e7d32',  // forest green
  purpose:             '#558b2f',   // olive green

  // Neutral/structural — specificity, reciprocity, conditionality, uni/multi
  specificity:         '#546e7a',   // slate
  conditionality:      '#6d4c41',   // warm brown
  reciprocity:         '#5e35b1',   // indigo-purple
  unilateral_vs_multilateral: '#303f9f',  // deep indigo

  // Metallic — weapons, capability, arms control
  capability:          '#37474f',   // steel
  delivery_system:     '#263238',   // gunmetal
  arms_control_and_testing: '#827717',  // olive (arms control)
};

// Fallback for any future filter field that hasn't been assigned yet.
export const DEFAULT_FIELD_COLOR = '#607d8b';

export function fieldColor(key: string): string {
  return FIELD_COLOR[key] || DEFAULT_FIELD_COLOR;
}
