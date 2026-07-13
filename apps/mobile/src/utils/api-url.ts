import { Platform } from 'react-native';

const DEFAULT_LOCAL_HOST = 'localhost';
const ANDROID_EMULATOR_HOST = '10.0.2.2';

const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (!envUrl) {
    return 'http://localhost:8070';
  }

  const url = new URL(envUrl);
  const originalHost = url.hostname;
  
  let targetHost = originalHost;

  if (originalHost === 'localhost' || originalHost === '127.0.0.1') {
    if (Platform.OS === 'android') {
      targetHost = ANDROID_EMULATOR_HOST;
    } else {
      targetHost = DEFAULT_LOCAL_HOST;
    }
  }

  return `${url.protocol}//${targetHost}:${url.port}`;
};

const getMobileApiUrl = (): string => {
  return `${getApiBaseUrl()}/api/mobile`;
};

export { getApiBaseUrl, getMobileApiUrl };