// Color-coding for the 1–10 overall-confidence score.
// Red-at-1 → yellow-at-5 → green-at-10 gradient, piecewise-linear in HSL
// so 5/10 lands exactly at yellow rather than drifting orange.
//
// Returned style is intended for a pill-style <span>: saturated background,
// white text, bold weight. Works against the dashboard's dark page background.

import type { CSSProperties } from 'react';

export function confidenceColor(raw: number): string {
  const c = Math.max(1, Math.min(10, raw));
  // 1→0°, 5→60°, 10→120°. Two linear segments.
  const h = c <= 5 ? ((c - 1) / 4) * 60 : 60 + ((c - 5) / 5) * 60;
  // Slightly darker at the extremes, mid-tone in the middle.
  const extreme = c <= 2 || c >= 9;
  const l = extreme ? 33 : 42;
  return `hsl(${h}, 70%, ${l}%)`;
}

export function confidencePillStyle(raw: number): CSSProperties {
  return {
    background: confidenceColor(raw),
    color: '#fff',
    fontWeight: 600,
  };
}
