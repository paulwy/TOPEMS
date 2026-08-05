import { useState, useEffect } from 'react';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkInfo {
  status: NetworkStatus;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

type ConnectionInfo = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

export function useNetworkStatus(): NetworkInfo {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine ? 'online' : 'offline';
    }
    return 'unknown';
  });

  const [effectiveType, setEffectiveType] = useState<string | undefined>(
    typeof navigator !== 'undefined' && 'connection' in navigator
      ? (navigator.connection as unknown as ConnectionInfo).effectiveType
      : undefined
  );

  const [downlink, setDownlink] = useState<number | undefined>(
    typeof navigator !== 'undefined' && 'connection' in navigator
      ? (navigator.connection as unknown as ConnectionInfo).downlink
      : undefined
  );

  const [rtt, setRtt] = useState<number | undefined>(
    typeof navigator !== 'undefined' && 'connection' in navigator
      ? (navigator.connection as unknown as ConnectionInfo).rtt
      : undefined
  );

  const [saveData, setSaveData] = useState<boolean | undefined>(
    typeof navigator !== 'undefined' && 'connection' in navigator
      ? (navigator.connection as unknown as ConnectionInfo).saveData
      : undefined
  );

  useEffect(() => {
    const updateConnectionInfo = () => {
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const connection = navigator.connection as unknown as ConnectionInfo;
        setEffectiveType(connection.effectiveType);
        setDownlink(connection.downlink);
        setRtt(connection.rtt);
        setSaveData(connection.saveData);
      }
    };

    const handleOnline = () => setStatus('online');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = navigator.connection as unknown as ConnectionInfo;
      connection.addEventListener?.('change', updateConnectionInfo);
      updateConnectionInfo();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const connection = navigator.connection as unknown as ConnectionInfo;
        connection.removeEventListener?.('change', updateConnectionInfo);
      }
    };
  }, []);

  return {
    status,
    effectiveType,
    downlink,
    rtt,
    saveData,
  };
}

export function useOnline(): boolean {
  const { status } = useNetworkStatus();
  return status === 'online';
}

export function useOffline(): boolean {
  const { status } = useNetworkStatus();
  return status === 'offline';
}

export function useNetworkCondition(): 'slow' | 'medium' | 'fast' | 'unknown' {
  const { effectiveType, rtt } = useNetworkStatus();

  if (!effectiveType || !rtt) {
    return 'unknown';
  }

  if (effectiveType === 'slow-2g' || effectiveType === '2g' || rtt >= 300) {
    return 'slow';
  }

  if (effectiveType === '3g' || rtt >= 150) {
    return 'medium';
  }

  return 'fast';
}
