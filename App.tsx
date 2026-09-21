import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Orbitron_600SemiBold,
  Orbitron_700Bold,
} from '@expo-google-fonts/orbitron';
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
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
import { fonts } from './src/theme/fonts';

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

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Ionicons name={name} size={20} color={focused ? colors.resource : colors.textDim} />
      {focused ? (
        <View
          style={{
            width: 18,
            height: 2,
            backgroundColor: colors.resource,
            borderRadius: 1,
            shadowColor: colors.resource,
            shadowOpacity: 0.8,
            shadowRadius: 4,
          }}
        />
      ) : (
        <View style={{ height: 2 }} />
      )}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#141816',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.resource,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: fonts.label,
          fontWeight: '700',
          letterSpacing: 1.4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'HOME',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          title: 'ACTIVITY',
          tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Status"
        component={StatusScreen}
        options={{
          title: 'STATUS',
          tabBarIcon: ({ focused }) => <TabIcon name="stats-chart" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ focused }) => <TabIcon name="settings-sharp" focused={focused} />,
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
              fontFamily: fonts.display,
              fontWeight: '700',
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
  const [fontsLoaded] = useFonts({
    Orbitron_600SemiBold,
    Orbitron_700Bold,
    BarlowCondensed_400Regular,
    BarlowCondensed_500Medium,
    BarlowCondensed_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.resource} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <BudgetProvider>
        <RootNavigator />
      </BudgetProvider>
    </SafeAreaProvider>
  );
}
