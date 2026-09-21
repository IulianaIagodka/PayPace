import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HudButton, Panel, ScreenBackground } from '../components/ui';
import { CURRENCIES } from '../services/currencies';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function SettingsScreen({ navigation }: Props) {
  const { store, updateSettings, setPremium, resetAll } = useBudget();
  const s = store.settings;
  const household = store.household;

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad}>
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
          <Text style={styles.label}>CURRENCY</Text>
          {CURRENCIES.map((currency) => (
            <Pressable
              key={currency.code}
              onPress={() => updateSettings({ currencyCode: currency.code })}
              style={styles.row}
            >
              <Text style={styles.rowText}>
                {currency.symbol} · {currency.code}
              </Text>
              <Text style={{ color: s.currencyCode === currency.code ? colors.resource : colors.textDim }}>
                {s.currencyCode === currency.code ? '●' : '○'}
              </Text>
            </Pressable>
          ))}

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
  section: { color: colors.text, fontWeight: '800', fontSize: 12, letterSpacing: 1.6, marginBottom: 4 },
  label: { color: colors.textSecondary, fontWeight: '700', fontSize: 11, letterSpacing: 1.4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
});
