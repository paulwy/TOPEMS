import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { NetworkService, type NetworkState } from '@/services/networkService';
import { OfflineService } from '@/services/offlineService';
import { SyncService } from '@/services/syncService';

interface OfflineIndicatorProps {
  inline?: boolean;
  onSync?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ inline = false, onSync }) => {
  const [networkState, setNetworkState] = useState<NetworkState>(NetworkService.getState());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = NetworkService.addListener((state) => {
      setNetworkState(state);
      if (state.status === 'online') {
        loadPendingCount();
      }
    });

    const loadPendingCount = async () => {
      const count = await OfflineService.getPendingCount();
      setPendingCount(count);
    };

    loadPendingCount();

    return () => unsubscribe();
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await SyncService.syncAll();
      const count = await OfflineService.getPendingCount();
      setPendingCount(count);
      onSync?.();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const isOffline = networkState.status === 'offline';

  if (!isOffline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={inline ? styles.inlineContainer : styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          {isSyncing ? (
            <RefreshCw size={16} color="#f59e0b" />
          ) : (
            <WifiOff size={16} color={isOffline ? '#dc2626' : '#f59e0b'} />
          )}
        </View>
        <Text style={styles.message}>
          {isSyncing
            ? '正在同步数据...'
            : isOffline
              ? `离线模式，${pendingCount} 条数据待同步`
              : `${pendingCount} 条数据待同步`}
        </Text>
        {!isOffline && !isSyncing && pendingCount > 0 && (
          <Text style={styles.syncButton} onPress={handleSync}>
            立即同步
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef3c7',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  inlineContainer: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinning: {
    transform: [{ rotate: '0deg' }],
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  syncButton: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '500',
  },
});

export default OfflineIndicator;
