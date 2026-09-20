import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BudgetProvider, useBudget } from './src/store/BudgetContext';
import type { RootStackParamList } from './src/navigation/types';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AddExpenseScreen } from './src/screens/AddExpenseScreen';
import { BillsScreen } from './src/screens/BillsScreen';
import { PayCycleScreen } from './src/screens/PayCycleScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ReceiptScanScreen } from './src/screens/ReceiptScanScreen';
import { CategoryBalancesScreen } from './src/screens/CategoryBalancesScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { ready, store, activeCycle } = useBudget();
  const showHome = store.settings.hasCompletedOnboarding && activeCycle != null;

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgTop }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer key={showHome ? 'app' : 'onboarding'}>
      <StatusBar style="dark" />
      {showHome ? (
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerTintColor: colors.accent,
            headerStyle: { backgroundColor: colors.bgTop },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bgTop },
            headerBackTitle: 'Back',
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PayPace' }} />
          <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add spending' }} />
          <Stack.Screen name="Bills" component={BillsScreen} options={{ title: 'Upcoming bills' }} />
          <Stack.Screen name="PayCycle" component={PayCycleScreen} options={{ title: 'Edit budget' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="ReceiptScan" component={ReceiptScanScreen} options={{ title: 'Scan receipt' }} />
          <Stack.Screen
            name="CategoryBalances"
            component={CategoryBalancesScreen}
            options={{ title: 'Categories' }}
          />
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
