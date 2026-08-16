import { describe, it, expect, vi } from 'vitest';

vi.mock('@/store', () => ({
  useNotificationStore: () => ({ addNotification: vi.fn() }),
  useAuthStore: () => ({ user: { id: '1', name: 'admin' }, token: 'test', tenantId: '1' }),
}));
vi.mock('@/modules/mobile/config', () => ({
  MOBILE_PATHS: { root: '/mobile', scan: '/mobile/scan' },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (x: string) => x,
    i18n: { language: 'zh', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('useMobileScan', () => {
  it('module loads and exports the hook', async () => {
    const mod = await import('@/pages/mobile/hooks/useMobileScan');
    expect(mod.useMobileScan).toBeDefined();
    expect(typeof mod.useMobileScan).toBe('function');
  });
});
