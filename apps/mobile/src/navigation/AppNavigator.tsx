import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import TaskPage from '@/pages/TaskPage';
import ApprovalPage from '@/pages/ApprovalPage';
import AttendancePage from '@/pages/AttendancePage';
import NotificationPage from '@/pages/NotificationPage';
import DocumentPage from '@/pages/DocumentPage';
import InventoryPage from '@/pages/InventoryPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import { useAuthStore } from '@/store/authStore';
import {
  Home,
  Square,
  ClipboardCheck,
  Calendar,
  User,
  Bell,
  FileText,
  Package,
} from 'lucide-react-native';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Task: undefined;
  Approval: undefined;
  Attendance: undefined;
  Notification: undefined;
  Document: undefined;
  Inventory: undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileStackScreen: React.FC = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <ProfileStack.Screen name="Profile" component={ProfilePage} options={{ title: '我的' }} />
      <ProfileStack.Screen name="Settings" component={SettingsPage} options={{ title: '设置' }} />
    </ProfileStack.Navigator>
  );
};

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Home':
              return <Home size={size} color={color} />;
            case 'Task':
              return <Square size={size} color={color} />;
            case 'Approval':
              return <ClipboardCheck size={size} color={color} />;
            case 'Attendance':
              return <Calendar size={size} color={color} />;
            case 'Notification':
              return <Bell size={size} color={color} />;
            case 'Document':
              return <FileText size={size} color={color} />;
            case 'Inventory':
              return <Package size={size} color={color} />;
            case 'Profile':
              return <User size={size} color={color} />;
            default:
              return <Home size={size} color={color} />;
          }
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingTop: 4,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardPage} options={{ title: '首页' }} />
      <Tab.Screen name="Task" component={TaskPage} options={{ title: '任务' }} />
      <Tab.Screen name="Approval" component={ApprovalPage} options={{ title: '审批' }} />
      <Tab.Screen name="Attendance" component={AttendancePage} options={{ title: '考勤' }} />
      <Tab.Screen name="Notification" component={NotificationPage} options={{ title: '通知' }} />
      <Tab.Screen name="Document" component={DocumentPage} options={{ title: '文档' }} />
      <Tab.Screen name="Inventory" component={InventoryPage} options={{ title: '库存' }} />
      <Tab.Screen name="Profile" component={ProfileStackScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isReady, setIsReady] = React.useState(false);
  const navigationRef = React.useRef(null);

  React.useEffect(() => {
    const bootstrapAsync = async () => {
      checkAuth();
      setIsReady(true);
    };

    bootstrapAsync();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false }} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
