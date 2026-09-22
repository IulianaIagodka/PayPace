/** PayPace HUD — diegetic sci-fi console (graphite steel + holographic cyan) */
export const colors = {
  bg: '#080B0F',
  bgGrid: '#10151C',
  panel: '#151B24',
  panelRaised: '#1C2530',
  panelAlt: '#243040',
  panelDeep: '#0A0E14',
  border: '#3E4A5A',
  borderBright: '#7A8A9C',
  borderSoft: '#1A222C',
  metal: '#A8B4C0',
  metalDim: '#5C6A7A',

  /** Holographic cyan — resource glow */
  resource: '#4AE0FF',
  resourceDim: '#1A90B0',
  resourceGlow: 'rgba(74, 224, 255, 0.32)',
  resourceSoft: 'rgba(74, 224, 255, 0.14)',
  healthy: '#4AE0FF',
  warning: '#E0B45A',
  danger: '#E06058',
  critical: '#B03A38',

  text: '#F2F6FA',
  textSecondary: '#8A9AAB',
  textDim: '#4A5A6A',
  safeValue: '#EAF4FA',
  ammo: '#D8ECF8',

  // legacy aliases
  bgTop: '#080B0F',
  bgMid: '#080B0F',
  bgBottom: '#080B0F',
  ink: '#F2F6FA',
  inkSecondary: '#8A9AAB',
  accent: '#4AE0FF',
  accentMid: '#4AE0FF',
  accentLight: '#4AE0FF',
  mint: '#243040',
  accentSoft: 'rgba(74, 224, 255, 0.14)',
  warm: '#E0B45A',
  success: '#4AE0FF',
  whiteSoft: '#151B24',
  whiteSofter: '#243040',
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

/** Healthy bars stay cyan; tip amber only when mid reserves */
export function segmentColor(index: number, lit: number, tone: ResourceTone): string {
  if (index >= lit) return '#0E141A';
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
