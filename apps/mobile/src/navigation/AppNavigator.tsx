import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import TaskPage from '@/pages/TaskPage';
import ApprovalPage from '@/pages/ApprovalPage';
import AttendancePage from '@/pages/AttendancePage';
import { useAuthStore } from '@/store/authStore';
import {
  Home,
  Square,
  ClipboardCheck,
  Calendar,
  User,
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
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

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
      <Tab.Screen
        name="Home"
        component={DashboardPage}
        options={{ title: '首页' }}
      />
      <Tab.Screen
        name="Task"
        component={TaskPage}
        options={{ title: '任务' }}
      />
      <Tab.Screen
        name="Approval"
        component={ApprovalPage}
        options={{ title: '审批' }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendancePage}
        options={{ title: '考勤' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTab}
        options={{ title: '我的' }}
      />
    </Tab.Navigator>
  );
};

import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Card,
  Title,
  List,
  Avatar,
  Text,
  Button,
  Divider,
} from 'react-native-paper';
import {
  Settings,
  Bell,
  HelpCircle,
  Info,
  LogOut,
} from 'lucide-react-native';

const ProfileTab: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <ScrollView style={styles.profileContainer}>
      <Card style={styles.profileCard} mode="elevated">
        <Card.Content style={styles.profileHeader}>
          <Avatar.Icon
            size={64}
            icon={() => <User size={32} color="#fff" />}
            style={{ backgroundColor: '#2563eb' }}
          />
          <View style={styles.profileInfo}>
            <Title style={styles.profileName}>{user?.name || '用户'}</Title>
            <Text style={styles.profileRole}>{user?.roles?.[0] || user?.full_name || '员工'}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.menuCard} mode="elevated">
        <Card.Content>
          <List.Item
            title="消息通知"
            left={() => <Bell size={20} color="#6b7280" />}
            right={() => <List.Icon icon="chevron-right" color="#9ca3af" />}
          />
          <Divider />
          <List.Item
            title="设置"
            left={() => <Settings size={20} color="#6b7280" />}
            right={() => <List.Icon icon="chevron-right" color="#9ca3af" />}
          />
          <Divider />
          <List.Item
            title="帮助中心"
            left={() => <HelpCircle size={20} color="#6b7280" />}
            right={() => <List.Icon icon="chevron-right" color="#9ca3af" />}
          />
          <Divider />
          <List.Item
            title="关于我们"
            left={() => <Info size={20} color="#6b7280" />}
            right={() => <List.Icon icon="chevron-right" color="#9ca3af" />}
          />
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={logout}
        style={styles.logoutButton}
        textColor="#dc2626"
        icon={() => <LogOut size={18} color="#dc2626" />}
      >
        退出登录
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  profileCard: {
    margin: 16,
    borderRadius: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  profileInfo: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  menuCard: {
    marginHorizontal: 16,
    borderRadius: 16,
  },
  logoutButton: {
    margin: 16,
    borderRadius: 12,
    borderColor: '#dc2626',
  },
});

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
        <Stack.Screen
          name="Login"
          component={LoginPage}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
