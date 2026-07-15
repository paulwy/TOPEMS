import NetInfo, {
  type NetInfoState,
  type NetInfoSubscription,
} from '@react-native-community/netinfo';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkState {
  status: NetworkStatus;
  isConnected: boolean;
  isInternetReachable: boolean;
  details?: {
    isWifi?: boolean;
    isCellular?: boolean;
    signalStrength?: number;
  };
}

type NetworkChangeCallback = (state: NetworkState) => void;

class NetworkService {
  private static currentState: NetworkState = {
    status: 'unknown',
    isConnected: false,
    isInternetReachable: false,
  };

  private static listeners: Set<NetworkChangeCallback> = new Set();
  private static subscription: NetInfoSubscription | null = null;
  private static initialized = false;

  static getState(): NetworkState {
    return { ...this.currentState };
  }

  static isOnline(): boolean {
    return this.currentState.status === 'online';
  }

  static isOffline(): boolean {
    return this.currentState.status === 'offline';
  }

  static addListener(callback: NetworkChangeCallback): () => void {
    this.listeners.add(callback);
    callback(this.currentState);
    return () => this.removeListener(callback);
  }

  static removeListener(callback: NetworkChangeCallback): void {
    this.listeners.delete(callback);
  }

  private static notifyListeners(state: NetworkState): void {
    this.listeners.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.warn('Network listener error:', error);
      }
    });
  }

  private static mapNetInfoState(state: NetInfoState): NetworkState {
    let status: NetworkStatus = 'unknown';
    if (state.isConnected && state.isInternetReachable) {
      status = 'online';
    } else if (!state.isConnected || (state.isConnected && state.isInternetReachable === false)) {
      status = 'offline';
    }

    return {
      status,
      isConnected: state.isConnected || false,
      isInternetReachable: state.isInternetReachable || false,
      details: {
        isWifi: state.type === 'wifi',
        isCellular: state.type === 'cellular',
      },
    };
  }

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    const initialState = await NetInfo.fetch();
    this.currentState = this.mapNetInfoState(initialState);

    this.subscription = NetInfo.addEventListener((state) => {
      const newState = this.mapNetInfoState(state);
      const statusChanged = newState.status !== this.currentState.status;

      this.currentState = newState;
      this.notifyListeners(newState);

      if (statusChanged) {
        if (newState.status === 'online') {
          this.onNetworkOnline();
        } else if (newState.status === 'offline') {
          this.onNetworkOffline();
        }
      }
    });

    this.initialized = true;
  }

  static async fetchCurrentState(): Promise<NetworkState> {
    const state = await NetInfo.fetch();
    return this.mapNetInfoState(state);
  }

  private static onNetworkOnline(): void {
    console.log('[NetworkService] Network online');
  }

  private static onNetworkOffline(): void {
    console.log('[NetworkService] Network offline');
  }

  static async destroy(): Promise<void> {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

export { NetworkService };
