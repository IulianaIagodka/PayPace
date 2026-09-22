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
import { HudButton, Panel, ScreenBackground } from '../components/ui';
import { FormScroll } from '../components/FormScroll';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { chrome } from '../theme/chrome';
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
    setPremium,
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

  if (!store.settings.isPremium && !household) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <FormScroll contentContainerStyle={chrome.pad}>
          <Text style={chrome.title}>Shared budget</Text>
          <Text style={chrome.sub}>
            Plus lets you and a partner share one payday budget. Each expense is tagged with who
            logged it.
          </Text>
          <HudButton title="TRY PLUS (DEMO)" onPress={() => setPremium(true)} />
          <HudButton title="BACK" onPress={() => navigation.goBack()} variant="secondary" />
        </FormScroll>
      </ScreenBackground>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      Alert.alert('Shared budget', error instanceof Error ? error.message : 'Something went wrong');
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
        <FormScroll contentContainerStyle={chrome.pad}>
          <Text style={chrome.title}>Shared budget</Text>
          <Text style={chrome.sub}>
            One budget for two. You both see the same balance, payday, bills, and spending.
          </Text>

          <Panel>
            <Text style={chrome.section}>{household.name}</Text>
            <Text style={chrome.label}>Invite code</Text>
            <Text style={styles.code}>{household.inviteCode}</Text>
            <View style={styles.rowGap}>
              <HudButton title="COPY CODE" onPress={copyCode} />
              <HudButton title="SHARE CODE" onPress={shareCode} variant="secondary" />
            </View>
            <Text style={chrome.sub}>
              {cloudSyncReady
                ? syncStatus === 'syncing'
                  ? 'Syncing…'
                  : syncStatus === 'error'
                    ? syncError ?? 'Sync hit a snag — try again.'
                    : 'Cloud sync is on · updates about every 20 seconds'
                : 'On this phone only — add Supabase keys to sync (see SHARED-BUDGET.md)'}
            </Text>
            {cloudSyncReady ? (
              <HudButton title="SYNC NOW" onPress={() => run(() => syncHouseholdNow())} variant="secondary" />
            ) : null}
          </Panel>

          <Panel>
            <Text style={chrome.section}>People</Text>
            {household.members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {member.displayName}
                    {member.id === localMember?.id ? ' · you' : ''}
                  </Text>
                  <Text style={chrome.sub}>{member.role === 'owner' ? 'Started this budget' : 'Partner'}</Text>
                </View>
              </View>
            ))}
            {household.members.length < 2 ? (
              <Text style={chrome.sub}>Waiting for your partner to join with the code.</Text>
            ) : null}
          </Panel>

          <Panel>
            <Text style={chrome.section}>Your name on expenses</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ira"
              placeholderTextColor={colors.textDim}
              style={chrome.field}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
            />
            <HudButton
              title="SAVE NAME"
              disabled={!name.trim() || busy}
              onPress={() => run(() => renameLocalMember(name))}
            />
          </Panel>

          <Panel>
            <Text style={chrome.section}>Spending this cycle</Text>
            {spentByMember.length === 0 ? (
              <Text style={chrome.sub}>No shared spending yet.</Text>
            ) : (
              spentByMember.map((row) => (
                <View key={row.name} style={styles.memberRow}>
                  <Text style={styles.memberName}>{row.name}</Text>
                  <Text style={styles.amount}>{formatMoney(row.total, currency)}</Text>
                </View>
              ))
            )}
          </Panel>

          <HudButton
            title="Leave shared budget"
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
      <FormScroll contentContainerStyle={chrome.pad}>
        <Text style={chrome.title}>Shared budget</Text>
        <Text style={chrome.sub}>
          Share one payday budget with your partner. Same balance, same safe-to-spend — expenses
          tagged by name.
        </Text>

        <Panel>
          <Text style={chrome.section}>Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ira"
            placeholderTextColor={colors.textDim}
            style={chrome.field}
            autoCapitalize="words"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
        </Panel>

        <Panel>
          <Text style={chrome.section}>Create a shared budget</Text>
          <Text style={chrome.sub}>You’ll get a code to send your partner.</Text>
          <HudButton
            title="Create shared budget"
            disabled={!name.trim() || busy}
            onPress={() => run(() => createHousehold(name))}
          />
        </Panel>

        <Panel>
          <Text style={chrome.section}>Join with a code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Invite code"
            placeholderTextColor={colors.textDim}
            style={chrome.field}
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
          />
          {!cloudSyncReady ? (
            <Text style={chrome.sub}>
              Joining needs cloud sync. Add your Supabase URL and anon key, then rebuild (see
              SHARED-BUDGET.md).
            </Text>
          ) : null}
        </Panel>

        {busy ? <ActivityIndicator color={colors.resource} /> : null}
      </FormScroll>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  code: {
    color: colors.resource,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 4,
    marginVertical: 6,
    fontFamily: fonts.display,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  memberName: { color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: fonts.body },
  amount: { color: colors.ammo, fontSize: 15, fontWeight: '700', fontFamily: fonts.display },
  rowGap: { gap: 10 },
});
