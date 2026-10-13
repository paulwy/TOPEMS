import { Platform } from 'react-native';

const DEFAULT_LOCAL_HOST = 'localhost';
const ANDROID_EMULATOR_HOST = '10.0.2.2';

const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!envUrl) {
    // P0-3 双轨合一：默认指向唯一对外入口 模块化单体 BFF topems-server:8099
    // （原 unified-core 独立进程 8000 前缀直连已在 nginx 层关闭，由 8099 内嵌服务适配器统一路由）。
    // 仍可通过 EXPO_PUBLIC_API_URL 环境变量覆盖（如指向预发/生产域名）。
    return 'http://localhost:8099';
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
