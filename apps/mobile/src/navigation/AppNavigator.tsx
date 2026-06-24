import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import { useAuthStore } from '@/store/authStore';

const Stack = createNativeStackNavigator<{
  Login: undefined;
  Dashboard: undefined;
}>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isReady, setIsReady] = React.useState(false);
  const navigationRef = React.useRef<typeof Stack.navigationRef>(null);

  React.useEffect(() => {
    const bootstrapAsync = async () => {
      checkAuth();
      setIsReady(true);
    };

    bootstrapAsync();
  }, []);

  const handleLoginSuccess = () => {
    navigationRef.current?.navigate('Dashboard');
  };

  if (!isReady) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Dashboard' : 'Login'}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1e3a8a',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="Login" options={{ headerShown: false }}>
          {() => <LoginPage onLoginSuccess={handleLoginSuccess} />}
        </Stack.Screen>
        <Stack.Screen
          name="Dashboard"
          component={DashboardPage}
          options={{
            title: '仪表盘',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
