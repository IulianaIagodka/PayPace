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
  /**
   * Tab + stack screen titles — one size/weight everywhere
   * (Home PAYPACE, Spend, Pace, Settings, Allocate, …).
   */
  screenTitle: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  /** Alias of screenTitle — PAYPACE wordmark / tab headers */
  brand: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  brandAccent: {
    color: colors.resource,
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
  /** Mid readout — expense rows / section totals */
  valueMid: {
    color: colors.ammo,
    fontSize: 15,
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
  bodyStrong: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.body,
    fontWeight: '600',
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
  link: {
    color: colors.resource,
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  field: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.body,
    fontWeight: '600',
  },
});

/** Shared outer padding for the four main tabs — keep Home/Spend/Pace/Settings aligned. */
export const tabScreen = StyleSheet.create({
  pad: {
    paddingHorizontal: hud.screenPad,
    paddingTop: 10,
    gap: hud.stackGap,
  },
});

/** Stack / modal form screens — Edit Cycle, Add, Bills, Allocate, … */
export const formScreen = StyleSheet.create({
  compactPad: { padding: 16, gap: 12, paddingBottom: 28 },
  pad: {
    padding: 20,
    gap: hud.stackGap,
    paddingBottom: 40,
  },
});

/**
 * One chrome for every text / amount / select control.
 * Box size stays identical; only the inner typeface changes (amount vs text).
 */
export const fieldChrome = StyleSheet.create({
  wrap: {
    gap: hud.gap,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panelDeep,
    borderRadius: 0,
    borderWidth: hud.stroke,
    borderColor: colors.border,
    paddingHorizontal: hud.pad,
    paddingVertical: 12,
    minHeight: 52,
  },
  wrapCompact: { gap: 4 },
  boxCompact: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 44 },
  amountInputCompact: { fontSize: 18, lineHeight: 22 },
  boxFocused: {
    borderColor: colors.borderBright,
    backgroundColor: colors.panelAlt,
  },
  textInput: {
    flex: 1,
    padding: 0,
    margin: 0,
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: fonts.body,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    padding: 0,
    margin: 0,
    color: colors.ammo,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  suffix: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginLeft: 8,
  },
});
