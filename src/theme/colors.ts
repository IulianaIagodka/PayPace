/** PayPace HUD — dark sci-fi resource console (industrial, not luxury fintech) */
export const colors = {
  bg: '#070605',
  bgGrid: '#12100C',
  panel: '#1A1612',
  panelRaised: '#262018',
  panelAlt: '#2C261E',
  panelDeep: '#0E0C0A',
  border: '#5C5040',
  borderBright: '#A09070',
  borderSoft: '#1A1612',
  metal: '#B8A888',
  metalDim: '#6E6454',

  /** Phosphor resource green — system-healthy, not neon candy */
  resource: '#6FAF45',
  resourceDim: '#3D6E28',
  resourceGlow: 'rgba(111, 175, 69, 0.28)',
  resourceSoft: 'rgba(111, 175, 69, 0.12)',
  healthy: '#6FAF45',
  /** Soft amber — paced warning */
  warning: '#D4A84A',
  /** Industrial alert red */
  danger: '#C45A42',
  critical: '#9A3A2C',

  text: '#E8E0D4',
  textSecondary: '#9A9080',
  textDim: '#5A5048',
  /** Calm readout — warm off-white */
  safeValue: '#E2DAC6',
  ammo: '#DCCEA0',

  // legacy aliases
  bgTop: '#070605',
  bgMid: '#070605',
  bgBottom: '#070605',
  ink: '#E8E0D4',
  inkSecondary: '#9A9080',
  accent: '#6FAF45',
  accentMid: '#6FAF45',
  accentLight: '#6FAF45',
  mint: '#2C261E',
  accentSoft: 'rgba(111, 175, 69, 0.12)',
  warm: '#D4A84A',
  success: '#6FAF45',
  whiteSoft: '#1A1612',
  whiteSofter: '#2C261E',
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
  food: 'cart-outline',
  transport: 'bus-outline',
  kids: 'people-outline',
  fun: 'restaurant-outline',
  home: 'home-outline',
  other: 'grid-outline',
};
