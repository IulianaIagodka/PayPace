import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HudButton, Panel, ScreenBackground } from '../components/ui';
import { HudSelect } from '../components/HudSelect';
import { WEEK_START_OPTIONS, type WeekStartsOn } from '../models/calculator';
import { CURRENCIES } from '../services/currencies';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function SettingsScreen({ navigation }: Props) {
  const { store, updateSettings, setPremium, resetAll } = useBudget();
  const s = store.settings;
  const household = store.household;
  const weekStartsOn = (s.weekStartsOn ?? 1) as WeekStartsOn;

  const currencyOptions = CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.symbol} · ${c.code} — ${c.name}`,
  }));

  const weekOptions = WEEK_START_OPTIONS.map((o) => ({
    value: o.value,
    label: `${o.short} — ${o.label}`,
  }));

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>
          PAY<Text style={{ color: colors.resource }}>PACE</Text>
        </Text>
        <Text style={styles.sub}>Money is energy. Configure the system.</Text>

        <Panel>
          <Text style={styles.section}>BUDGET</Text>
          <HudButton title="ALLOCATE RESOURCES" onPress={() => navigation.navigate('Allocate')} />
          <HudButton title="EDIT CYCLE" onPress={() => navigation.navigate('PayCycle')} variant="secondary" />
          <HudButton title="BILLS" onPress={() => navigation.navigate('Bills')} variant="secondary" />
        </Panel>

        <Panel>
          <Text style={styles.section}>SHARE</Text>
          <Text style={styles.sub}>
            {household
              ? `Linked · ${household.members.map((m) => m.displayName).join(' & ')}`
              : 'Invite a partner to the same cycle.'}
          </Text>
          <HudButton title="SHARED BUDGET" onPress={() => navigation.navigate('SharedBudget')} />
        </Panel>

        <Panel>
          <Text style={styles.section}>SYSTEM</Text>

          <HudSelect
            label="CURRENCY"
            value={s.currencyCode}
            options={currencyOptions}
            onChange={(code) => updateSettings({ currencyCode: code })}
          />

          <View style={styles.divider} />
          <Text style={styles.label}>REMAINING HORIZON</Text>
          <Text style={styles.sub}>
            Show how much is left until the end of the week or month. Categories follow the same window.
          </Text>
          <View style={styles.weekGrid}>
            {([
              { value: 'week' as const, short: 'WEEK' },
              { value: 'month' as const, short: 'MONTH' },
            ]).map((opt) => {
              const on = (s.paceHorizon ?? 'week') === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => updateSettings({ paceHorizon: opt.value })}
                  style={[styles.weekChip, on && styles.weekChipOn]}
                >
                  <Text style={[styles.weekChipText, on && styles.weekChipTextOn]}>{opt.short}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />
          <HudSelect
            label="WEEK STARTS ON"
            value={weekStartsOn}
            options={weekOptions}
            hint="Weekly safe-to-spend follows this calendar week. Use payday weekday if pay lands mid-week."
            onChange={(value) => updateSettings({ weekStartsOn: value })}
          />

          <View style={styles.divider} />
          <Text style={styles.label}>PREMIUM</Text>
          {s.isPremium ? (
            <HudButton title="RESTORE FREE (DEMO)" onPress={() => setPremium(false)} variant="secondary" />
          ) : (
            <>
              <Text style={styles.sub}>Receipt scan unlock (demo).</Text>
              <HudButton title="UPGRADE (DEMO)" onPress={() => setPremium(true)} />
            </>
          )}
          <HudButton
            title="SCAN RECEIPT"
            onPress={() => navigation.navigate('ReceiptScan')}
            variant="secondary"
          />

          <View style={styles.divider} />
          <HudButton
            title="START OVER"
            variant="danger"
            onPress={() =>
              Alert.alert('Start over?', 'Clears local budget setup.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => resetAll() },
              ])
            }
          />
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 14, paddingBottom: 40 },
  brand: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  sub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  section: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: fonts.label,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  weekChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelDeep,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 3,
    minWidth: 48,
    alignItems: 'center',
  },
  weekChipOn: {
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
  },
  weekChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1,
  },
  weekChipTextOn: { color: colors.resource },
});
