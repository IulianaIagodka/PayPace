import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HudButton, ScreenBackground, SoftCard } from '../components/ui';
import { PlusUnlockButton } from '../components/PlusUnlockButton';
import { FormScroll } from '../components/FormScroll';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { hudType } from '../theme/hud';
import type { RootStackParamList } from '../navigation/types';
import { formatMoney } from '../services/formatting';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedBudget'>;

export function SharedBudgetScreen({ navigation }: Props) {
  const {
    store,
    activeCycle,
    localMember,
    cloudSyncReady,
    syncStatus,
    syncError,
    createHousehold,
    joinHousehold,
    leaveHousehold,
    renameLocalMember,
    syncHouseholdNow,
  } = useBudget();

  const household = store.household;
  const [name, setName] = useState(store.settings.displayName || localMember?.displayName || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const currency = store.settings.currencyCode;

  const spentByMember = useMemo(() => {
    const expenses = activeCycle?.expenses ?? [];
    const map = new Map<string, { name: string; total: number }>();
    for (const expense of expenses) {
      const key = expense.memberId ?? 'unknown';
      const label = expense.memberName ?? 'Unknown';
      const row = map.get(key) ?? { name: label, total: 0 };
      row.total += expense.amount;
      row.name = label;
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [activeCycle?.expenses]);

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <FormScroll contentContainerStyle={styles.pad}>
          <Text style={styles.title}>SHARED BUDGET</Text>
          <Text style={styles.sub}>
            SHARED BUDGET is Plus only. Share one payday budget with a partner — each expense is
            tagged with who logged it.
          </Text>
          <PlusUnlockButton />
          <HudButton title="Back" onPress={() => navigation.goBack()} variant="secondary" />
        </FormScroll>
      </ScreenBackground>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      Alert.alert('SHARED BUDGET', error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!household) return;
    await Clipboard.setStringAsync(household.inviteCode);
    Alert.alert('Copied', `Invite code ${household.inviteCode} is on your clipboard.`);
  };

  const shareCode = async () => {
    if (!household) return;
    await Share.share({
      message: `Join our PayPace budget with code ${household.inviteCode}`,
    });
  };

  if (household) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <FormScroll contentContainerStyle={styles.pad}>
          <Text style={styles.title}>SHARED BUDGET</Text>
          <Text style={styles.sub}>
            One budget for two. You both see the same balance, payday, bills, and spending.
          </Text>

          <SoftCard>
            <Text style={styles.section}>{household.name}</Text>
            <Text style={styles.codeLabel}>Invite code</Text>
            <Text style={styles.code}>{household.inviteCode}</Text>
            <View style={styles.rowGap}>
              <HudButton title="Copy code" onPress={copyCode} variant="secondary" />
              <HudButton title="Share code" onPress={shareCode} variant="secondary" />
            </View>
            <Text style={styles.hint}>
              {cloudSyncReady
                ? syncStatus === 'syncing'
                  ? 'Syncing…'
                  : syncStatus === 'error'
                    ? syncError ?? 'Sync hit a snag — try again.'
                    : 'Cloud sync is on · updates about every 20 seconds'
                : 'On this phone only — add Supabase keys to sync (see SHARED-BUDGET.md)'}
            </Text>
            {cloudSyncReady ? (
              <HudButton
                title="Sync now"
                onPress={() => run(() => syncHouseholdNow())}
                variant="secondary"
              />
            ) : null}
          </SoftCard>

          <SoftCard>
            <Text style={styles.section}>People</Text>
            {household.members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {member.displayName}
                    {member.id === localMember?.id ? ' · you' : ''}
                  </Text>
                  <Text style={styles.hint}>{member.role === 'owner' ? 'Started this budget' : 'Partner'}</Text>
                </View>
              </View>
            ))}
            {household.members.length < 2 ? (
              <Text style={styles.hint}>Waiting for your partner to join with the code.</Text>
            ) : null}
          </SoftCard>

          <SoftCard>
            <Text style={styles.section}>Your name on expenses</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ira"
              placeholderTextColor={colors.textDim}
              style={styles.field}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
            />
            <HudButton
              title="Save name"
              disabled={!name.trim() || busy}
              onPress={() => run(() => renameLocalMember(name))}
              variant="secondary"
            />
          </SoftCard>

          <SoftCard>
            <Text style={styles.section}>Spending this cycle</Text>
            {spentByMember.length === 0 ? (
              <Text style={styles.hint}>No shared spending yet.</Text>
            ) : (
              spentByMember.map((row) => (
                <View key={row.name} style={styles.memberRow}>
                  <Text style={styles.memberName}>{row.name}</Text>
                  <Text style={styles.amount}>{formatMoney(row.total, currency)}</Text>
                </View>
              ))
            )}
          </SoftCard>

          <HudButton
            title="Leave shared budget"
            variant="danger"
            onPress={() =>
              Alert.alert(
                'Leave shared budget?',
                'This phone keeps a local copy. Your partner keeps the shared household.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => run(() => leaveHousehold()),
                  },
                ],
              )
            }
          />
          {busy ? <ActivityIndicator color={colors.resource} /> : null}
        </FormScroll>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <FormScroll contentContainerStyle={styles.pad}>
        <Text style={styles.title}>SHARED BUDGET</Text>
        <Text style={styles.sub}>
          Share one payday budget with your partner. Same balance, same safe-to-spend — expenses
          tagged by name.
        </Text>

        <SoftCard>
          <Text style={styles.section}>Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ira"
            placeholderTextColor={colors.textDim}
            style={styles.field}
            autoCapitalize="words"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
        </SoftCard>

        <SoftCard>
          <Text style={styles.section}>Create a shared budget</Text>
          <Text style={styles.hint}>You’ll get a code to send your partner.</Text>
          <HudButton
            title="Create shared budget"
            disabled={!name.trim() || busy}
            onPress={() => run(() => createHousehold(name))}
            variant="secondary"
          />
        </SoftCard>

        <SoftCard>
          <Text style={styles.section}>Join with a code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Invite code"
            placeholderTextColor={colors.textDim}
            style={styles.field}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
          <HudButton
            title="Join"
            disabled={!name.trim() || !code.trim() || busy}
            onPress={() => run(() => joinHousehold(code, name))}
            variant="secondary"
          />
          {!cloudSyncReady ? (
            <Text style={styles.hint}>
              Joining needs cloud sync. Add your Supabase URL and anon key, then rebuild (see
              SHARED-BUDGET.md).
            </Text>
          ) : null}
        </SoftCard>

        {busy ? <ActivityIndicator color={colors.resource} /> : null}
      </FormScroll>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { ...hudType.screenTitle },
  sub: { ...hudType.body },
  section: { ...hudType.label, color: colors.text },
  codeLabel: { ...hudType.meta, marginTop: 4 },
  code: { ...hudType.valueHero, color: colors.resource, letterSpacing: 4, marginVertical: 6 },
  hint: { ...hudType.body },
  field: {
    backgroundColor: colors.panelDeep,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...hudType.field,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  memberName: { ...hudType.bodyStrong },
  amount: { ...hudType.valueMid },
  rowGap: { gap: 10 },
});
