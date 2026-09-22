import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { fonts } from './fonts';

/** Shared diegetic console typography & spacing for every screen. */
export const chrome = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40, gap: 14 },
  brand: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 3.2,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 2,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.body,
  },
  section: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.display,
    fontWeight: '700',
  },
  big: {
    color: colors.ammo,
    fontSize: 32,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  link: {
    color: colors.resource,
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  field: {
    backgroundColor: '#0A1016',
    borderWidth: 2,
    borderTopColor: '#050608',
    borderLeftColor: '#050608',
    borderRightColor: '#4A5460',
    borderBottomColor: '#5A6570',
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.body,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
});
