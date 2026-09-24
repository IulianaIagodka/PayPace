import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenBackground, SecondaryButton, SegmentedBar, SoftCard } from '../components/ui';
import { PlusUnlockButton } from '../components/PlusUnlockButton';
import { categoryTitle, nextCategoryInCycle } from '../services/categories';
import { categoryBalancesForDisplay } from '../services/categoryBalances';
import { formatMoney } from '../services/formatting';
import { analyzeReceiptPhoto, type ReceiptScanResult } from '../services/receiptAnalyzer';
import { withReceiptCategory } from '../services/receiptCategory';
import {
  FREE_RECEIPT_SCAN_LIMIT,
  canScanReceipt,
  freeReceiptScansRemaining,
} from '../services/receiptScanQuota';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { ExpenseCategory } from '../models/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReceiptScan'>;

export function ReceiptScanScreen({ navigation }: Props) {
  const { store, activeCycle, addExpense, recordReceiptScan } = useBudget();
  const currency = store.settings.currencyCode;
  const custom = store.settings.customCategories ?? [];
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const [saving, setSaving] = useState(false);

  const remaining = freeReceiptScansRemaining(store.settings);
  const allowed = canScanReceipt(store.settings);

  const receiptCategory: ExpenseCategory = result?.items[0]?.category ?? 'other';
  const receiptTotal = useMemo(() => {
    if (!result) return 0;
    if (result.total && result.total > 0) return result.total;
    return result.items.reduce((sum, item) => sum + item.amount, 0);
  }, [result]);

  const cycleReceiptCategory = () => {
    setResult((prev) => {
      if (!prev?.items.length) return prev;
      const current = prev.items[0]?.category ?? 'other';
      return withReceiptCategory(prev, nextCategoryInCycle(current, custom));
    });
  };

  const cycleCategoryBalances = categoryBalancesForDisplay(activeCycle, custom);

  if (!allowed) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.title}>Scan receipt</Text>
          <Text style={styles.sub}>
            You’ve used your {FREE_RECEIPT_SCAN_LIMIT} free receipt scans. Plus unlocks unlimited
            scans, plus statements and category tools.
          </Text>
          <PlusUnlockButton />
          <SecondaryButton title="Back" onPress={() => navigation.goBack()} />
        </ScrollView>
      </ScreenBackground>
    );
  }

  const pick = async (fromCamera: boolean) => {
    if (!canScanReceipt(store.settings)) {
      Alert.alert('Free scans used', `Upgrade to Plus for unlimited receipt scans.`);
      return;
    }

    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera and photo access to scan a receipt.');
      return;
    }

    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({
          quality: 0.7,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          base64: true,
          mediaTypes: ['images'],
        });

    if (picked.canceled || !picked.assets[0]?.uri) return;
    const asset = picked.assets[0];
    setPhotoUri(asset.uri);
    setResult(null);
    setScanning(true);
    try {
      const scanned = await analyzeReceiptPhoto(asset.uri, asset.base64);
      setResult(scanned);
      await recordReceiptScan();
    } catch (error) {
      Alert.alert('Scan failed', error instanceof Error ? error.message : 'Try another photo.');
    } finally {
      setScanning(false);
    }
  };

  const saveReceipt = async () => {
    if (!result?.items.length || saving) return;
    setSaving(true);
    try {
      await addExpense({
        name: result.merchant?.trim() || 'Receipt',
        amount: receiptTotal,
        category: receiptCategory,
      });
      Alert.alert('Saved', 'This receipt is now in this pay cycle.', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
      ]);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const money = (amount: number) => formatMoney(amount, currency, { decimals: 2 });

  const categorySoFar = money(
    (activeCycle?.expenses ?? [])
      .filter((e) => (e.category ?? 'other') === receiptCategory)
      .reduce((sum, e) => sum + e.amount, 0) + receiptTotal,
  );

  const freeHint =
    remaining == null
      ? 'Snap a photo. One receipt goes into one category — tap to change it.'
      : `Free plan: ${remaining} of ${FREE_RECEIPT_SCAN_LIMIT} receipt scans left. One receipt → one category.`;

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Scan receipt</Text>
        <Text style={styles.sub}>{freeHint}</Text>

        <PrimaryButton title="Take photo" onPress={() => pick(true)} />
        <SecondaryButton title="Choose from gallery" onPress={() => pick(false)} />

        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        ) : null}

        {scanning ? (
          <SoftCard>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.sub}>Reading the receipt…</Text>
          </SoftCard>
        ) : null}

        {result ? (
          <>
            <SoftCard>
              <Text style={styles.section}>
                {result.merchant ?? 'Receipt'} · {result.source === 'ai' ? 'AI' : 'Demo scan'}
              </Text>
              <Text style={styles.sub}>Total recognized: {money(receiptTotal)}</Text>
            </SoftCard>

            <SoftCard>
              <Pressable
                onPress={cycleReceiptCategory}
                style={styles.groupHead}
                accessibilityRole="button"
                accessibilityLabel={`Change category, currently ${categoryTitle(receiptCategory, { custom })}`}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.section}>{categoryTitle(receiptCategory, { custom })}</Text>
                  <Text style={styles.tapHint}>Tap to change category</Text>
                </View>
                <Text style={styles.amount}>{money(receiptTotal)}</Text>
              </Pressable>
              <Text style={styles.balanceHint}>
                This category so far (including this receipt): {categorySoFar}
              </Text>
              {result.items.map((item) => (
                <View key={item.id} style={styles.line}>
                  <Text style={[styles.lineName, { flex: 1, paddingRight: 8 }]}>{item.name}</Text>
                  <Text style={styles.lineAmount}>{money(item.amount)}</Text>
                </View>
              ))}
            </SoftCard>

            <PrimaryButton
              title={saving ? 'Saving…' : 'Add receipt'}
              onPress={saveReceipt}
              disabled={saving}
            />
          </>
        ) : null}

        <Text style={styles.section}>Spending by category</Text>
        <SoftCard>
          {cycleCategoryBalances.every((c) => c.spent === 0) ? (
            <Text style={styles.sub}>
              Nothing categorized yet — scan a receipt or log an expense.
            </Text>
          ) : (
            cycleCategoryBalances.map((row) => (
              <View key={row.category} style={styles.balanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{row.title}</Text>
                  <View style={styles.barTrack}>
                    <SegmentedBar ratio={row.share} segments={8} height={8} />
                  </View>
                </View>
                <Text style={styles.amount}>{formatMoney(row.spent, currency)}</Text>
              </View>
            ))
          )}
        </SoftCard>

        <Pressable onPress={() => navigation.navigate('CategoryBalances')}>
          <Text style={styles.link}>See all categories</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 14, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  sub: { color: colors.inkSecondary, fontSize: 15, lineHeight: 21 },
  section: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  preview: { width: '100%', height: 200, borderRadius: 16, backgroundColor: colors.whiteSoft },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  balanceHint: { color: colors.inkSecondary, fontSize: 13, marginBottom: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  lineName: { color: colors.ink, fontSize: 15 },
  tapHint: { color: colors.inkSecondary, fontSize: 12, marginTop: 2 },
  lineAmount: { color: colors.ink, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  barTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(24, 42, 34, 0.08)',
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { height: '100%', borderRadius: 99 },
  link: { color: colors.accent, fontWeight: '700', fontSize: 15 },
});
