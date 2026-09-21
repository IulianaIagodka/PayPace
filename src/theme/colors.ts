/** PayPace HUD — Doom status-bar industrial */
export const colors = {
  bg: '#0A0806',
  bgGrid: '#120E0A',
  panel: '#1A1612',
  panelRaised: '#242018',
  panelAlt: '#2A241C',
  panelDeep: '#100E0B',
  border: '#5A5040',
  borderBright: '#9A8A6A',
  borderSoft: '#1C1814',
  metal: '#B0A080',
  metalDim: '#6A6050',

  /** Toxic Doom green — health / live resources */
  resource: '#55FF00',
  resourceDim: '#2A8A00',
  resourceGlow: 'rgba(85, 255, 0, 0.28)',
  resourceSoft: 'rgba(85, 255, 0, 0.1)',
  healthy: '#55FF00',
  /** Classic Doom ammo / readout yellow */
  warning: '#FFCC00',
  /** Industrial alert red — not blood */
  danger: '#D94A30',
  critical: '#A83828',

  text: '#E8E0D0',
  textSecondary: '#9A9080',
  textDim: '#5A5048',
  /** Big counters — Doom yellow digits */
  safeValue: '#FFDD33',
  ammo: '#FFDD33',

  // legacy aliases
  bgTop: '#0A0806',
  bgMid: '#0A0806',
  bgBottom: '#0A0806',
  ink: '#E8E0D0',
  inkSecondary: '#9A9080',
  accent: '#55FF00',
  accentMid: '#55FF00',
  accentLight: '#55FF00',
  mint: '#2A241C',
  accentSoft: 'rgba(85, 255, 0, 0.1)',
  warm: '#FFCC00',
  success: '#55FF00',
  whiteSoft: '#1A1612',
  whiteSofter: '#2A241C',
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
  if (index >= lit) return '#12100C';
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
