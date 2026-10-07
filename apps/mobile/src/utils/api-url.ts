import { Platform } from 'react-native';

const DEFAULT_LOCAL_HOST = 'localhost';
const ANDROID_EMULATOR_HOST = '10.0.2.2';

const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!envUrl) {
    // FE-21 对齐：默认指向 unified-core 独立进程端口 8000（与 apps/web/src/config/ports.ts
    // 的 BACKEND_PORTS.core 单一信源一致；原 8070 在端口表中不存在，属陈旧默认值）。
    // 模块化单体模式（topems-server:8099）请显式设置 EXPO_PUBLIC_API_URL。
    return 'http://localhost:8000';
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
