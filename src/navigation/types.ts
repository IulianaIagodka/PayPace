import type { EnvelopeKey, ExpenseCategory } from '../models/types';
import type { SpendGroupMode } from '../services/spendGrouping';

export type ActivityTabParams = {
  /** Open Spend grouped by day or category. */
  groupBy?: SpendGroupMode;
  /** Focus / filter to this category (from Home rail). */
  category?: ExpenseCategory;
  /** Prefer envelope key when present (matches Home modules). */
  envelopeKey?: EnvelopeKey;
};

export type MainTabParamList = {
  Home: undefined;
  Activity: ActivityTabParams | undefined;
  Status: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs:
    | {
        screen?: keyof MainTabParamList;
        params?: MainTabParamList[keyof MainTabParamList];
      }
    | undefined;
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
