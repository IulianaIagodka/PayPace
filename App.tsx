import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BudgetProvider, useBudget } from './src/store/BudgetContext';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { StatusScreen } from './src/screens/StatusScreen';
import { AddExpenseScreen } from './src/screens/AddExpenseScreen';
import { BillsScreen } from './src/screens/BillsScreen';
import { PayCycleScreen } from './src/screens/PayCycleScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AllocateScreen } from './src/screens/AllocateScreen';
import { ReceiptScanScreen } from './src/screens/ReceiptScanScreen';
import { CategoryBalancesScreen } from './src/screens/CategoryBalancesScreen';
import { SharedBudgetScreen } from './src/screens/SharedBudgetScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.panel,
    text: colors.text,
    border: colors.border,
    primary: colors.resource,
  },
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        color: focused ? colors.resource : colors.textDim,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8,
      }}
    >
      {label}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.resource,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'HOME',
          tabBarIcon: ({ focused }) => <TabIcon label="▣" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          title: 'ACTIVITY',
          tabBarIcon: ({ focused }) => <TabIcon label="☰" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Status"
        component={StatusScreen}
        options={{
          title: 'STATUS',
          tabBarIcon: ({ focused }) => <TabIcon label="▦" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ focused }) => <TabIcon label="⚙" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { ready, store, activeCycle } = useBudget();
  const showHome = store.settings.hasCompletedOnboarding && activeCycle != null;

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.resource} />
      </View>
    );
  }

  return (
    <NavigationContainer key={showHome ? 'app' : 'onboarding'} theme={navTheme}>
      <StatusBar style="light" />
      {showHome ? (
        <Stack.Navigator
          screenOptions={{
            headerTintColor: colors.resource,
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
            headerBackTitle: 'Back',
            headerTitleStyle: {
              fontWeight: '800',
              color: colors.text,
            },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'ADD EXPENSE' }} />
          <Stack.Screen name="Allocate" component={AllocateScreen} options={{ title: 'ALLOCATE' }} />
          <Stack.Screen name="Bills" component={BillsScreen} options={{ title: 'BILLS' }} />
          <Stack.Screen name="PayCycle" component={PayCycleScreen} options={{ title: 'EDIT CYCLE' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'HISTORY' }} />
          <Stack.Screen name="ReceiptScan" component={ReceiptScanScreen} options={{ title: 'SCAN' }} />
          <Stack.Screen name="CategoryBalances" component={CategoryBalancesScreen} options={{ title: 'CELLS' }} />
          <Stack.Screen name="SharedBudget" component={SharedBudgetScreen} options={{ title: 'SHARE' }} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <BudgetProvider>
        <RootNavigator />
      </BudgetProvider>
    </SafeAreaProvider>
  );
}
