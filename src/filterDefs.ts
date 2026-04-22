// Shared filter/tag definitions for the Statement Browser tab and the
// bar-click drilldown modal. Changing this file updates BOTH the filter
// dropdowns and the per-card tag display (Statements.tsx and
// StatementDrilldown.tsx), so the two stay in sync.

export interface FilterDef {
  key: string;
  label: string;
  // Optional explicit ordering for values (e.g. 'Very Low' → 'Very High').
  ordinal?: string[];
  // If true, extract "(Level N)" suffixes for 1→5 numeric ordering —
  // NTS Tone / Consequences / Conditionality / Specificity.
  ordinalByLevel?: boolean;
}

// Intensity ordinal, used for RRLS line_intensity + threat_intensity.
export const INTENSITY_ORDER = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

export const RRLS_FILTERS: FilterDef[] = [
  { key: 'theme', label: 'Theme' },
  { key: 'audience', label: 'Audience' },
  { key: 'nature_of_threat', label: 'Nature of Threat' },
  { key: 'level_of_escalation', label: 'Escalation' },
  { key: 'line_type', label: 'Line Type' },
  { key: 'threat_type', label: 'Threat Type' },
  { key: 'line_intensity', label: 'Line Intensity', ordinal: INTENSITY_ORDER },
  { key: 'threat_intensity', label: 'Threat Intensity', ordinal: INTENSITY_ORDER },
  { key: 'specificity', label: 'Specificity' },
  { key: 'immediacy', label: 'Immediacy' },
  { key: 'durability', label: 'Durability' },
  { key: 'reciprocity', label: 'Reciprocity' },
  { key: 'geopolitical_area_of_concern', label: 'Area of Concern' },
  { key: 'temporal_context', label: 'Temporal Context' },
  { key: 'underlying_values_or_interests', label: 'Values / Interests' },
  { key: 'unilateral_vs_multilateral', label: 'Uni vs Multilateral' },
  { key: 'rhetorical_device', label: 'Rhetorical Device' },
];

export const NTS_FILTERS: FilterDef[] = [
  { key: 'nts_statement_type', label: 'Statement Type' },
  { key: 'nts_threat_type', label: 'Threat Type' },
  { key: 'capability', label: 'Capability' },
  { key: 'tone', label: 'Tone', ordinalByLevel: true },
  { key: 'consequences', label: 'Consequences', ordinalByLevel: true },
  { key: 'conditionality', label: 'Conditionality', ordinalByLevel: true },
  { key: 'specificity', label: 'Specificity', ordinalByLevel: true },
  { key: 'delivery_system', label: 'Delivery System' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'context', label: 'Context' },
  { key: 'geographical_reach', label: 'Geographical Reach' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'audience', label: 'Audience' },
  { key: 'rhetorical_device', label: 'Rhetorical Device' },
  { key: 'arms_control_and_testing', label: 'Arms Control' },
];

// line_type / threat_type use 'line' / 'threat' keys in the color palette.
export const COLOR_KEY_FOR = (filterKey: string): string =>
  filterKey === 'line_type' ? 'line' : filterKey === 'threat_type' ? 'threat' : filterKey;
