import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useBudget } from '../store/BudgetContext';
import { reportReadyPrompt } from '../services/periodReports';
import type { RootStackParamList } from '../navigation/types';

/**
 * When a week/month report is generated, ask View now vs Later.
 * Later keeps a link on Pace; View opens the report screen.
 */
export function PeriodReportPrompt() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { pendingReportPrompt, dismissReportPrompt, store } = useBudget();
  const promptingRef = useRef(false);
  const hasOnboarding = store.settings.hasCompletedOnboarding;

  useEffect(() => {
    if (!hasOnboarding || !pendingReportPrompt || promptingRef.current) return;
    promptingRef.current = true;
    const report = pendingReportPrompt;
    const { title, body } = reportReadyPrompt(report);

    Alert.alert(title, body, [
      {
        text: 'Later',
        style: 'cancel',
        onPress: () => {
          promptingRef.current = false;
          dismissReportPrompt();
        },
      },
      {
        text: 'View',
        onPress: () => {
          promptingRef.current = false;
          dismissReportPrompt({ view: true });
          navigation.navigate('PeriodReport', { reportId: report.id });
        },
      },
    ]);
  }, [hasOnboarding, pendingReportPrompt, dismissReportPrompt, navigation]);

  return null;
}
