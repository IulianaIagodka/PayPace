import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

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
}: {
  label: string;
  value: T;
  options: Array<HudSelectOption<T>>;
  onChange: (value: T) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.trigger, open && styles.triggerOpen]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected?.label ?? '—'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.resource}
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
                style={[styles.option, on && styles.optionOn]}
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
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.panelDeep,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  triggerOpen: {
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
  },
  triggerText: {
    flex: 1,
    color: colors.ammo,
    fontSize: 15,
    fontWeight: '600',
  },
  menu: {
    borderWidth: 2,
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
  optionOn: { backgroundColor: colors.resourceSoft },
  optionText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', flex: 1 },
  optionTextOn: { color: colors.resource },
  check: { color: colors.resource, fontSize: 12 },
});
