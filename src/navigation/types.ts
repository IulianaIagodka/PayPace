export type MainTabParamList = {
  Home: undefined;
  Activity: undefined;
  Status: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  AddExpense: undefined;
  Bills: undefined;
  PayCycle: undefined;
  History: undefined;
  Allocate: undefined;
  ReceiptScan: undefined;
  StatementImport: undefined;
  CategoryBalances: undefined;
  SharedBudget: undefined;
  // legacy names kept so older imports typecheck during transition
  Home: undefined;
  Settings: undefined;
};
