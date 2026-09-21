export type PaySchedule =
  | 'monthly'
  | 'twiceMonthly'
  | 'everyTwoWeeks'
  | 'weekly'
  | 'custom';

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'subscriptions'
  | 'loan'
  | 'childcare'
  | 'groceries'
  | 'transport'
  | 'food'
  | 'other';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO
  category?: ExpenseCategory;
  isRecurring: boolean;
  isPaid: boolean;
  updatedAt?: string;
}

export interface DailyExpense {
  id: string;
  name: string;
  amount: number;
  date: string; // ISO
  category?: ExpenseCategory;
  /** Who logged this spend (shared household). */
  memberId?: string;
  memberName?: string;
  updatedAt?: string;
}

export interface PayCycle {
  id: string;
  schedule: PaySchedule;
  startDate: string;
  nextPayday: string;
  currentBalance: number;
  expectedPaycheck: number;
  savingsGoal: number;
  emergencyBuffer: number;
  spendingBuffer: number;
  bills: Bill[];
  expenses: DailyExpense[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type HouseholdMemberRole = 'owner' | 'partner';

export interface HouseholdMember {
  id: string;
  displayName: string;
  deviceId: string;
  role: HouseholdMemberRole;
  joinedAt: string;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  members: HouseholdMember[];
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface AppSettings {
  hasCompletedOnboarding: boolean;
  currencyCode: string;
  notificationsEnabled: boolean;
  morningReminderEnabled: boolean;
  billRemindersEnabled: boolean;
  paceWarningsEnabled: boolean;
  isPremium: boolean;
  /** Display name used when logging shared spends. */
  displayName: string;
}

export interface AppStoreData {
  settings: AppSettings;
  cycles: PayCycle[];
  household: Household | null;
  /** This device's member id inside household.members */
  localMemberId: string | null;
}

/** Payload synced to the cloud for a shared household. */
export interface SharedHouseholdPayload {
  household: Household;
  settings: Pick<AppSettings, 'currencyCode'>;
  cycles: PayCycle[];
  revision: number;
  updatedAt: string;
}

export interface SafeSpendSnapshot {
  remainingUntilPayday: number;
  safeToSpendToday: number;
  daysUntilPayday: number;
  totalDaysInCycle: number;
  daysElapsed: number;
  cycleProgress: number;
  unpaidBillsTotal: number;
  spentThisCycle: number;
  reservedTotal: number;
  isAtRisk: boolean;
  projectedShortfallDays: number | null;
}

export const defaultSettings: AppSettings = {
  hasCompletedOnboarding: false,
  currencyCode: 'UAH',
  notificationsEnabled: false,
  morningReminderEnabled: true,
  billRemindersEnabled: true,
  paceWarningsEnabled: true,
  isPremium: false,
  displayName: '',
};

export const emptyStore: AppStoreData = {
  settings: defaultSettings,
  cycles: [],
  household: null,
  localMemberId: null,
};
