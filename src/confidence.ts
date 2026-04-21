// Color-coding for the 1–10 overall-confidence score.
//
// Uses ColorBrewer's RdYlGn diverging palette (https://colorbrewer2.org) —
// the same 11-class palette that matplotlib, seaborn, Plotly, and most
// dashboards use for red/yellow/green scales. Hand-picked for perceptual
// uniformity, so each step is visually distinct without the banding you
// get from naive linear HSL interpolation.
//
// We map 1→10 onto 10 of the 11 classes, dropping the near-white midpoint
// (#ffffbf) so every pill retains legible contrast against dark dashboard
// backgrounds. c=1 is the darkest red, c=5 lands on a light yellow,
// c=10 on the darkest green.
//
// Text color is chosen per swatch from a relative-luminance test so it
// stays readable whether the background is dark-red, light-yellow, or
// mid-green.

import type { CSSProperties } from 'react';

// ColorBrewer RdYlGn 11-class, midpoint #ffffbf removed.
const RDYLGN: Record<number, string> = {
  1:  '#a50026',  // darkest red
  2:  '#d73027',  // red
  3:  '#f46d43',  // orange-red
  4:  '#fdae61',  // light orange
  5:  '#fee08b',  // light yellow (user-requested midpoint anchor)
  6:  '#d9ef8b',  // light yellow-green (skips the pale-white midpoint)
  7:  '#a6d96a',  // light green
  8:  '#66bd63',  // green
  9:  '#1a9850',  // darker green
  10: '#006837',  // darkest green
};

// WCAG relative luminance (simplified: straight RGB, no gamma correction —
// fine for the yes/no text-color decision).
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function confidenceColor(raw: number): string {
  const c = Math.max(1, Math.min(10, Math.round(raw)));
  return RDYLGN[c];
}

export function confidencePillStyle(raw: number): CSSProperties {
  const bg = confidenceColor(raw);
  return {
    background: bg,
    color: luminance(bg) > 0.55 ? '#111' : '#fff',
    fontWeight: 600,
  };
}
