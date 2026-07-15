import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { Wifi, WifiOff, Cloud } from 'lucide-react-native';
import { NetworkService, type NetworkState } from '@/services/networkService';
import { OfflineService } from '@/services/offlineService';

interface NetworkStatusBarProps {
  showPendingCount?: boolean;
}

const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({ showPendingCount = true }) => {
  const [networkState, setNetworkState] = useState<NetworkState>(NetworkService.getState());
  const [pendingCount, setPendingCount] = useState(0);
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    const unsubscribe = NetworkService.addListener((state) => {
      setNetworkState(state);
      animateBar(state.status === 'offline');
    });

    const loadPendingCount = async () => {
      const count = await OfflineService.getPendingCount();
      setPendingCount(count);
    };

    loadPendingCount();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await OfflineService.getPendingCount();
      setPendingCount(count);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const animateBar = (show: boolean) => {
    Animated.timing(slideAnim, {
      toValue: show ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const isOffline = networkState.status === 'offline';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={isOffline ? styles.offlineContent : styles.onlineContent}>
        <View style={styles.iconContainer}>
          {isOffline ? (
            <WifiOff size={18} color="white" />
          ) : networkState.details?.isWifi ? (
            <Wifi size={18} color="white" />
          ) : networkState.details?.isCellular ? (
            <Cloud size={18} color="white" />
          ) : (
            <Wifi size={18} color="white" />
          )}
        </View>
        <Text style={styles.statusText}>
          {isOffline ? '离线模式' : networkState.details?.isWifi ? 'Wi-Fi' : '蜂窝网络'}
        </Text>
        {isOffline && showPendingCount && pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{pendingCount}</Text>
          </View>
        )}
        {!isOffline && <Text style={styles.onlineHint}>数据将自动同步</Text>}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
  },
  offlineContent: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineContent: {
    backgroundColor: '#16a34a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  onlineHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: 'auto',
  },
});

export default NetworkStatusBar;
