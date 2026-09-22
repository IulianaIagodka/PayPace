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
import { HudButton, Panel, ScreenBackground, SegmentedBar } from '../components/ui';
import { categoryTitle, allCategoryIds, nextCategoryInCycle } from '../services/categories';
import { categoryBalancesForDisplay } from '../services/categoryBalances';
import { formatMoney } from '../services/formatting';
import {
  analyzeReceiptPhoto,
  type ReceiptLineItem,
  type ReceiptScanResult,
} from '../services/receiptAnalyzer';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { chrome } from '../theme/chrome';
import type { RootStackParamList } from '../navigation/types';
import type { ExpenseCategory } from '../models/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReceiptScan'>;

export function ReceiptScanScreen({ navigation }: Props) {
  const { store, activeCycle, addExpenses, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const custom = store.settings.customCategories ?? [];
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);

  const cycleItemCategory = (itemId: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) => {
          if (item.id !== itemId) return item;
          return { ...item, category: nextCategoryInCycle(item.category, custom) };
        }),
      };
    });
  };

  const grouped = useMemo(() => {
    if (!result) return [] as Array<{ category: ExpenseCategory; items: ReceiptLineItem[]; total: number }>;
    const map = new Map<ExpenseCategory, ReceiptLineItem[]>();
    for (const item of result.items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return allCategoryIds(custom)
      .map((category) => {
        const items = map.get(category) ?? [];
        return {
          category,
          items,
          total: items.reduce((sum, item) => sum + item.amount, 0),
        };
      })
      .filter((g) => g.items.length > 0);
  }, [result, custom]);

  const cycleCategoryBalances = categoryBalancesForDisplay(activeCycle, custom);

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={chrome.pad}>
          <Text style={chrome.title}>Scan receipt</Text>
          <Text style={chrome.sub}>
            Plus reads the receipt, sorts line items by category, and shows what’s left in each.
          </Text>
          <HudButton title="TRY PLUS (DEMO)" onPress={() => setPremium(true)} />
          <HudButton title="BACK" onPress={() => navigation.goBack()} variant="secondary" />
        </ScrollView>
      </ScreenBackground>
    );
  }

  const pick = async (fromCamera: boolean) => {
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
    } catch (error) {
      Alert.alert('Scan failed', error instanceof Error ? error.message : 'Try another photo.');
    } finally {
      setScanning(false);
    }
  };

  const saveAll = async () => {
    if (!result?.items.length) return;
    await addExpenses(
      result.items.map((item) => ({
        name: item.name,
        amount: item.amount,
        category: item.category,
      })),
    );
    Alert.alert('Saved', 'Those items are now in this pay cycle.', [
      { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
    ]);
  };

  const money = (amount: number) => formatMoney(amount, currency, { decimals: 2 });

  const cycleCategory = (category: ExpenseCategory) =>
    money(
      (activeCycle?.expenses ?? [])
        .filter((e) => (e.category ?? 'other') === category)
        .reduce((sum, e) => sum + e.amount, 0) +
        (grouped.find((g) => g.category === category)?.total ?? 0),
    );

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={chrome.pad} keyboardShouldPersistTaps="handled">
        <Text style={chrome.title}>Scan receipt</Text>
        <Text style={chrome.sub}>
          Snap a photo. We’ll group the items by category so you can see each balance.
        </Text>

        <HudButton title="TAKE PHOTO" onPress={() => pick(true)} />
        <HudButton title="CHOOSE FROM GALLERY" onPress={() => pick(false)} variant="secondary" />

        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        ) : null}

        {scanning ? (
          <Panel>
            <ActivityIndicator color={colors.resource} />
            <Text style={chrome.sub}>Reading the receipt…</Text>
          </Panel>
        ) : null}

        {result ? (
          <>
            <Panel>
              <Text style={chrome.section}>
                {result.merchant ?? 'Receipt'} · {result.source === 'ai' ? 'AI' : 'Demo scan'}
              </Text>
              <Text style={chrome.sub}>
                Total recognized: {money(result.total ?? 0)}
              </Text>
            </Panel>

            {grouped.map((group) => (
              <Panel key={group.category}>
                <View style={styles.groupHead}>
                  <Text style={chrome.section}>{categoryTitle(group.category, { custom })}</Text>
                  <Text style={styles.amount}>{money(group.total)}</Text>
                </View>
                <Text style={styles.balanceHint}>
                  This category so far (including this receipt): {cycleCategory(group.category)}
                </Text>
                {group.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => cycleItemCategory(item.id)}
                    style={styles.line}
                    accessibilityRole="button"
                    accessibilityLabel={`Change category for ${item.name}`}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.lineName}>{item.name}</Text>
                      <Text style={styles.tapHint}>Tap to change category</Text>
                    </View>
                    <Text style={styles.lineAmount}>{money(item.amount)}</Text>
                  </Pressable>
                ))}
              </Panel>
            ))}

            <HudButton title="ADD EVERYTHING" onPress={saveAll} />
          </>
        ) : null}

        <Text style={chrome.section}>Spending by category</Text>
        <Panel>
          {cycleCategoryBalances.every((c) => c.spent === 0) ? (
            <Text style={chrome.sub}>
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
        </Panel>

        <Pressable onPress={() => navigation.navigate('CategoryBalances')}>
          <Text style={styles.link}>See all categories</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 200, borderRadius: 2, backgroundColor: colors.panelDeep, borderWidth: 1, borderColor: colors.border },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { color: colors.ammo, fontWeight: '700', fontSize: 16, fontFamily: fonts.display },
  balanceHint: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, fontFamily: fonts.body },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  lineName: { color: colors.text, fontSize: 15, fontFamily: fonts.body },
  tapHint: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  lineAmount: { color: colors.ammo, fontWeight: '600', fontFamily: fonts.display },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  barTrack: {
    height: 8,
    borderRadius: 1,
    backgroundColor: colors.panelDeep,
    overflow: 'hidden',
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barFill: { height: '100%', borderRadius: 1 },
  link: { color: colors.resource, fontWeight: '700', fontSize: 13, letterSpacing: 1.2, fontFamily: fonts.label },
});
