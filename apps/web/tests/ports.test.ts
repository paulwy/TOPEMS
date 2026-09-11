import { describe, it, expect } from 'vitest';
import { BACKEND_PORTS, MF_PORTS, getBackendPort, getMfPort } from '@/config/ports';

describe('config/ports - BACKEND_PORTS 常量', () => {
  it('unified-core 虚拟服务端口 8000', () => {
    expect(BACKEND_PORTS.iam).toBe(8000);
    expect(BACKEND_PORTS.core).toBe(8000);
    expect(BACKEND_PORTS.flow).toBe(8000);
    expect(BACKEND_PORTS.doc).toBe(8000);
    expect(BACKEND_PORTS.file).toBe(8000);
  });

  it('统一入口服务端口 8099 (erp/finance/hrm/pm)', () => {
    expect(BACKEND_PORTS.erp).toBe(8099);
    expect(BACKEND_PORTS.finance).toBe(8099);
    expect(BACKEND_PORTS.hrm).toBe(8099);
    expect(BACKEND_PORTS.pm).toBe(8099);
  });

  it('统一入口服务端口 8099 (search/communication/ticket/master-data)', () => {
    expect(BACKEND_PORTS.search).toBe(8099);
    expect(BACKEND_PORTS.communication).toBe(8099);
    expect(BACKEND_PORTS.ticket).toBe(8099);
    expect(BACKEND_PORTS['master-data']).toBe(8099);
  });
});

describe('config/ports - MF_PORTS 常量', () => {
  it('topems_core=3001, topems_erp=3002, topems_hrm=3003', () => {
    expect(MF_PORTS.topems_core).toBe(3001);
    expect(MF_PORTS.topems_erp).toBe(3002);
    expect(MF_PORTS.topems_hrm).toBe(3003);
  });

  it('topems_bi=3015, topems_ai=3017', () => {
    expect(MF_PORTS.topems_bi).toBe(3015);
    expect(MF_PORTS.topems_ai).toBe(3017);
  });
});

describe('config/ports - getBackendPort', () => {
  it('存在服务返回对应端口', () => {
    expect(getBackendPort('iam')).toBe(8000);
    expect(getBackendPort('erp')).toBe(8099);
    expect(getBackendPort('bi')).toBe(8099);
  });

  it('不存在服务使用默认 fallback 8000', () => {
    expect(getBackendPort('nonexistent')).toBe(8000);
  });

  it('不存在服务使用自定义 fallback', () => {
    expect(getBackendPort('nonexistent', 9999)).toBe(9999);
  });
});

describe('config/ports - getMfPort', () => {
  it('存在模块返回对应端口', () => {
    expect(getMfPort('topems_core')).toBe(3001);
    expect(getMfPort('topems_bi')).toBe(3015);
  });

  it('不存在模块使用默认 fallback 3000', () => {
    expect(getMfPort('topems_xxx')).toBe(3000);
  });

  it('不存在模块使用自定义 fallback', () => {
    expect(getMfPort('topems_xxx', 4000)).toBe(4000);
  });
});
