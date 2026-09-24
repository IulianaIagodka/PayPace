/** PayPace HUD — Doom industrial, evening-friendly (less acid neon) */
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

  /** Muted olive resource green — readable, not eye-searing */
  resource: '#6FAF45',
  resourceDim: '#3D6E28',
  resourceGlow: 'rgba(111, 175, 69, 0.22)',
  resourceSoft: 'rgba(111, 175, 69, 0.10)',
  healthy: '#6FAF45',
  /** Soft amber — not neon yellow */
  warning: '#D4A84A',
  /** Industrial alert red — not blood */
  danger: '#C45A42',
  critical: '#9A3A2C',

  text: '#E4DCD0',
  textSecondary: '#9A9080',
  textDim: '#5A5048',
  /** Calm readout — warm off-white, not acid yellow */
  safeValue: '#E0D8C4',
  ammo: '#D8C890',

  // legacy aliases
  bgTop: '#0A0806',
  bgMid: '#0A0806',
  bgBottom: '#0A0806',
  ink: '#E4DCD0',
  inkSecondary: '#9A9080',
  accent: '#6FAF45',
  accentMid: '#6FAF45',
  accentLight: '#6FAF45',
  mint: '#2A241C',
  accentSoft: 'rgba(111, 175, 69, 0.10)',
  warm: '#D4A84A',
  success: '#6FAF45',
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
  home: 'home-outline',
  groceries: 'cart-outline',
  food: 'restaurant-outline',
  transport: 'bus-outline',
  shopping: 'bag-handle-outline',
  kids: 'people-outline',
  health: 'medkit-outline',
  fun: 'game-controller-outline',
  travel: 'airplane-outline',
  subscriptions: 'card-outline',
  other: 'grid-outline',
};
