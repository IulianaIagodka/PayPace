/**
 * Local notifications when shared-budget metrics move.
 * Works while the app is open or backgrounded on-device; full remote push
 * while killed still needs device tokens + a server sender.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { PaceMetrics } from './partnerMetricsNotify';
import { diffPaceMetrics, partnerMetricsNotice } from './partnerMetricsNotify';
import { formatMoney } from './formatting';

let handlerReady = false;
let permissionAsked = false;

function ensureHandler() {
  if (handlerReady) return;
  handlerReady = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  ensureHandler();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (permissionAsked && !current.canAskAgain) return false;
  permissionAsked = true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function notifyPaceMetricsChanged(input: {
  before: PaceMetrics;
  after: PaceMetrics;
  currencyCode: string;
  enabled: boolean;
}): Promise<boolean> {
  if (!input.enabled) return false;
  if (Platform.OS === 'web') return false;

  const changes = diffPaceMetrics(input.before, input.after);
  const notice = partnerMetricsNotice(changes, (n) => formatMoney(n, input.currencyCode));
  if (!notice) return false;

  const ok = await ensureNotificationPermission();
  if (!ok) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notice.title,
      body: notice.body,
      sound: false,
    },
    trigger: null,
  });
  return true;
}
