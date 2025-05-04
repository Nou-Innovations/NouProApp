import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';

// Import screens
import InboxScreen from './src/screens/InboxScreen';
import DeliveryScreen from './src/screens/DeliveryScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import ProfileScreen from './src/screens/ProfileScreen';

type RootStackParamList = {
  MainTabs: undefined;
};

type TabParamList = {
  Inbox: undefined;
  Delivery: undefined;
  Products: undefined;
  Invoices: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen 
        name="Inbox" 
        component={InboxScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <Icon name="message-circle" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Delivery" 
        component={DeliveryScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <Icon name="truck" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <Icon name="package" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Invoices" 
        component={InvoicesScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <Icon name="file-text" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <Icon name="user" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="MainTabs" 
            component={TabNavigator}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
} 