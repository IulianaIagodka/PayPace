import type { EnvelopeKey } from '../models/types';

export type MainTabParamList = {
  Home: undefined;
  Activity: undefined;
  Status: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: { screen?: keyof MainTabParamList; params?: undefined } | undefined;
  AddExpense: { envelopeKey?: EnvelopeKey } | undefined;
  Bills: undefined;
  PayCycle: undefined;
  History: undefined;
  Allocate: undefined;
  ReceiptScan: undefined;
  StatementImport: { horizon?: 'week' | 'month' } | undefined;
  CategoryBalances: undefined;
  SharedBudget: undefined;
  PeriodReport: { reportId: string };
  // legacy names kept so older imports typecheck during transition
  Home: undefined;
  Settings: undefined;
};
