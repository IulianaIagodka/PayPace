import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { fonts } from './fonts';

/** Shared HUD control-system tokens — one physical language for every module. */
export const hud = {
  stroke: 2,
  cornerSize: 14,
  cornerStroke: 3,
  rivet: 4,
  rivetInset: 5,
  gap: 8,
  pad: 14,
  padCompact: 10,
  meterHeight: 14,
  meterGap: 2,
  meterPad: 3,
  meterSegments: 10,
  screenPad: 16,
  stackGap: 12,
} as const;

export type HUDPanelVariant = 'primary' | 'standard' | 'compact';

export const hudType = StyleSheet.create({
  /** Uppercase condensed — labels / status */
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  labelPrimary: {
    color: colors.resource,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  labelWarn: {
    color: colors.warning,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  /** Sci-fi display — important numbers only */
  value: {
    color: colors.ammo,
    fontSize: 28,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  valueHero: {
    color: colors.safeValue,
    fontSize: 40,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  valueCompact: {
    color: colors.ammo,
    fontSize: 12,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  /** Condensed sans — regular readable text */
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  meta: {
    color: colors.metal,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  unit: {
    color: colors.metal,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
