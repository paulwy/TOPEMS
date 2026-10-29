import { getApiBaseUrl, getMobileApiUrl } from '../api-url';

// react-native 在 jest node 环境 ESM 解析失败——mock 为可变 Platform 对象
jest.mock('react-native', () => {
  const Platform = { OS: 'ios' };
  return { Platform };
});
import { Platform } from 'react-native';

const currentOS = Platform as unknown as { OS: 'ios' | 'android' };

const ENV_KEY = 'EXPO_PUBLIC_API_URL';

function setEnv(v: string | undefined) {
  if (v === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = v;
  }
}

describe('getApiBaseUrl', () => {
  afterEach(() => {
    setEnv(undefined);
    currentOS.OS = 'ios';
  });

  test('无环境变量时默认指向本机 BFF 8099', () => {
    setEnv(undefined);
    expect(getApiBaseUrl()).toBe('http://localhost:8099');
  });

  test('getMobileApiUrl 拼接 /api/mobile 前缀', () => {
    setEnv(undefined);
    expect(getMobileApiUrl()).toBe('http://localhost:8099/api/mobile');
  });

  test('环境变量 localhost + iOS 保持 localhost', () => {
    setEnv('http://localhost:3000');
    currentOS.OS = 'ios';
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  test('环境变量 localhost + Android 换 10.0.2.2（模拟器主机别名）', () => {
    setEnv('http://localhost:3000');
    currentOS.OS = 'android';
    expect(getApiBaseUrl()).toBe('http://10.0.2.2:3000');
  });

  test('环境变量 127.0.0.1 同样走本地别名逻辑', () => {
    setEnv('http://127.0.0.1:8080');
    currentOS.OS = 'android';
    expect(getApiBaseUrl()).toBe('http://10.0.2.2:8080');
  });

  test('环境变量远端域名（默认端口 443 省略）', () => {
    setEnv('https://api.topems.example.com:443');
    currentOS.OS = 'android';
    expect(getApiBaseUrl()).toBe('https://api.topems.example.com');
  });

  test('环境变量远端域名（无端口不产生悬空冒号）', () => {
    setEnv('https://prod.example.com');
    currentOS.OS = 'android';
    expect(getApiBaseUrl()).toBe('https://prod.example.com');
  });

  test('环境变量含路径时仅取 protocol/host/port（路径不拼接）', () => {
    setEnv('http://localhost:3000/api/mobile');
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  test('https 协议保持', () => {
    setEnv('https://localhost:8443');
    currentOS.OS = 'ios';
    expect(getApiBaseUrl()).toBe('https://localhost:8443');
  });
});
