import React, { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from '@/navigation/AppNavigator';
import { PushService } from '@/services/pushService';
import { OfflineService } from '@/services/offlineService';
import { NetworkService } from '@/services/networkService';
import { SyncService } from '@/services/syncService';
import NetworkStatusBar from '@/components/NetworkStatusBar';

const App: React.FC = () => {
  useEffect(() => {
    const initializeApp = async () => {
      await OfflineService.init();
      await NetworkService.initialize();
      await SyncService.startAutoSync();
    };

    const initPushNotifications = async () => {
      await PushService.initialize();
      await PushService.registerDevice();
    };

    initializeApp();
    initPushNotifications();
  }, []);

  return (
    <PaperProvider>
      <NetworkStatusBar />
      <AppNavigator />
    </PaperProvider>
  );
};

export default App;
