/** PayPace HUD — harder Doom industrial, sparse for readability */
export const colors = {
  bg: '#050605',
  bgGrid: '#0A0C0A',
  panel: '#121612',
  panelRaised: '#1A1F1A',
  panelAlt: '#1C211C',
  panelDeep: '#0B0D0B',
  border: '#4A524A',
  borderBright: '#7A847A',
  borderSoft: '#151915',
  metal: '#9AA29A',
  metalDim: '#5A625A',

  resource: '#6CFF2A',
  resourceDim: '#2E8A1C',
  resourceGlow: 'rgba(108, 255, 42, 0.22)',
  resourceSoft: 'rgba(108, 255, 42, 0.08)',
  healthy: '#6CFF2A',
  warning: '#E8A020',
  danger: '#E8331A',
  critical: '#B01010',

  text: '#F2F4EE',
  textSecondary: '#8E968E',
  textDim: '#555D55',
  /** Neutral safe-to-spend readout (not a warning color). */
  safeValue: '#DCE6D8',

  // legacy aliases
  bgTop: '#050605',
  bgMid: '#050605',
  bgBottom: '#050605',
  ink: '#F2F4EE',
  inkSecondary: '#8E968E',
  accent: '#6CFF2A',
  accentMid: '#6CFF2A',
  accentLight: '#6CFF2A',
  mint: '#1C211C',
  accentSoft: 'rgba(108, 255, 42, 0.08)',
  warm: '#E8A020',
  success: '#6CFF2A',
  whiteSoft: '#121612',
  whiteSofter: '#1C211C',
};

export const spacing = {
  screen: 16,
};

export type ResourceTone = 'healthy' | 'warning' | 'danger' | 'critical' | 'empty';

export function toneForRatio(remainingRatio: number): ResourceTone {
  if (remainingRatio <= 0) return 'critical';
  if (remainingRatio < 0.15) return 'danger';
  if (remainingRatio < 0.4) return 'warning';
  return 'healthy';
}

export function colorForTone(tone: ResourceTone): string {
  switch (tone) {
    case 'healthy':
      return colors.resource;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'critical':
      return colors.critical;
    default:
      return colors.border;
  }
}

/** Healthy bars tip amber on the last lit chunk (FPS HUD feel) */
export function segmentColor(index: number, lit: number, tone: ResourceTone): string {
  if (index >= lit) return '#0C0E0C';
  if (tone === 'healthy' && lit > 1 && index === lit - 1) return colors.warning;
  return colorForTone(tone);
}

export const paceGradient = [colors.resource, colors.healthy, colors.warning, colors.danger] as const;

export const ENVELOPE_ICON_NAMES: Record<string, string> = {
  food: 'restaurant-outline',
  transport: 'bus-outline',
  kids: 'people-outline',
  fun: 'game-controller-outline',
  home: 'home-outline',
  other: 'grid-outline',
};
