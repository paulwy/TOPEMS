import React, { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from '@/navigation/AppNavigator';
import { PushService } from '@/services/pushService';

const App: React.FC = () => {
  useEffect(() => {
    const initPushNotifications = async () => {
      await PushService.initialize();
      await PushService.registerDevice();
    };

    initPushNotifications();
  }, []);

  return (
    <PaperProvider>
      <AppNavigator />
    </PaperProvider>
  );
};

export default App;
