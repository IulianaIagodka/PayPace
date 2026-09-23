import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { hud } from '../theme/hud';

export type HudSelectOption<T extends string | number> = {
  value: T;
  label: string;
};

export function HudSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
  compact = false,
}: {
  label: string;
  value: T;
  options: Array<HudSelectOption<T>>;
  onChange: (value: T) => void;
  hint?: string;
  /** Tighter padding / no long hint — for Settings stacks. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={styles.label}>{label}</Text>
      {!compact && hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[
          styles.trigger,
          compact && styles.triggerCompact,
          open && styles.triggerOpen,
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.triggerText, compact && styles.triggerTextCompact]} numberOfLines={1}>
          {selected?.label ?? '—'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={compact ? 14 : 16}
          color={colors.borderBright}
        />
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {options.map((opt) => {
            const on = opt.value === value;
            return (
              <Pressable
                key={String(opt.value)}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={[styles.option, compact && styles.optionCompact, on && styles.optionOn]}
              >
                <Text style={[styles.optionText, on && styles.optionTextOn]}>{opt.label}</Text>
                {on ? <Text style={styles.check}>●</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  wrapCompact: { gap: 4 },
  label: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: fonts.label,
  },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: -2 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: hud.stroke,
    borderColor: colors.border,
    backgroundColor: colors.panelDeep,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  triggerCompact: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  triggerOpen: {
    borderColor: colors.borderBright,
    backgroundColor: colors.panelAlt,
  },
  triggerText: {
    flex: 1,
    color: colors.ammo,
    fontSize: 15,
    fontWeight: '600',
  },
  triggerTextCompact: {
    fontSize: 14,
  },
  menu: {
    borderWidth: hud.stroke,
    borderColor: colors.border,
    backgroundColor: colors.panelAlt,
    borderRadius: 0,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionCompact: {
    paddingVertical: 9,
  },
  optionOn: { backgroundColor: 'rgba(154, 138, 106, 0.12)' },
  optionText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', flex: 1 },
  optionTextOn: { color: colors.ammo },
  check: { color: colors.ammo, fontSize: 12 },
});
