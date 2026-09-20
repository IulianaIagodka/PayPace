import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenBackground, SoftCard } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { store, updateSettings, setPremium, resetAll } = useBudget();
  const s = store.settings;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Settings</Text>
        <SoftCard>
          <Text style={styles.brand}>PayPace</Text>
          <Text style={styles.sub}>Know exactly what you can spend until payday.</Text>
        </SoftCard>

        <SoftCard>
          <Text style={styles.section}>Currency</Text>
          {(['PLN', 'USD', 'EUR', 'GBP'] as const).map((code) => (
            <Pressable key={code} onPress={() => updateSettings({ currencyCode: code })} style={styles.row}>
              <Text style={styles.rowText}>{code}</Text>
              <Text style={{ color: s.currencyCode === code ? colors.accent : colors.inkSecondary }}>
                {s.currencyCode === code ? '●' : '○'}
              </Text>
            </Pressable>
          ))}
        </SoftCard>

        <SoftCard>
          <Text style={styles.section}>Notifications</Text>
          <Toggle
            label="Enable notifications"
            value={s.notificationsEnabled}
            onChange={(v) => updateSettings({ notificationsEnabled: v })}
          />
          <Toggle
            label="Morning safe-to-spend"
            value={s.morningReminderEnabled}
            onChange={(v) => updateSettings({ morningReminderEnabled: v })}
          />
          <Toggle
            label="Bill reminders"
            value={s.billRemindersEnabled}
            onChange={(v) => updateSettings({ billRemindersEnabled: v })}
          />
        </SoftCard>

        <SoftCard>
          <Text style={styles.section}>Premium</Text>
          {s.isPremium ? (
            <>
              <Text style={{ color: colors.success, fontWeight: '600' }}>Premium active</Text>
              <PrimaryButton title="Restore free (demo)" onPress={() => setPremium(false)} />
            </>
          ) : (
            <>
              <Text style={styles.sub}>
                Recurring bills, unlimited pay cycles, history, widgets, advanced notifications.
              </Text>
              <Text style={styles.price}>$2.99/month or $19.99/year</Text>
              <PrimaryButton title="Upgrade (demo unlock)" onPress={() => setPremium(true)} />
            </>
          )}
        </SoftCard>

        <PrimaryButton title="View history" onPress={() => navigation.navigate('History')} />
        <PrimaryButton
          title="Reset all data"
          onPress={() =>
            Alert.alert('Erase all PayPace data?', undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => resetAll() },
            ])
          }
        />
      </ScrollView>
    </ScreenBackground>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={{ color: value ? colors.accent : colors.inkSecondary }}>{value ? 'On' : 'Off'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 14 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  brand: { fontSize: 22, fontWeight: '700', color: colors.ink },
  sub: { color: colors.inkSecondary, fontSize: 15, lineHeight: 21 },
  section: { color: colors.ink, fontWeight: '700', fontSize: 16, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowText: { color: colors.ink, fontSize: 15 },
  price: { color: colors.accent, fontWeight: '700', fontSize: 15 },
});
