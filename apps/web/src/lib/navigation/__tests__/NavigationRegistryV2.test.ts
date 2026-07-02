import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NavigationRegistryV2 } from '../NavigationRegistryV2';

describe('NavigationRegistryV2', () => {
  let registry: NavigationRegistryV2;
  const registeredCodes: string[] = [];

  beforeEach(() => {
    registry = NavigationRegistryV2.getInstance();
  });

  afterEach(() => {
    // Clean up any modules registered during tests
    for (const code of registeredCodes) {
      registry.unregisterModule(code);
    }
    registeredCodes.length = 0;
  });

  it('should be a singleton', () => {
    const instance1 = NavigationRegistryV2.getInstance();
    const instance2 = NavigationRegistryV2.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should register and retrieve modules', () => {
    registry.registerModule({
      code: 'test-phase3',
      name: 'Test Module',
      icon: 'Test',
      path: '/test-phase3',
      source: 'core',
      navItems: [],
    });
    registeredCodes.push('test-phase3');
    expect(registry.getModule('test-phase3')).toBeDefined();
    expect(registry.getModule('test-phase3')?.name).toBe('Test Module');
  });

  it('should unregister modules', () => {
    registry.registerModule({
      code: 'test-remove',
      name: 'Remove Me',
      icon: 'Test',
      path: '/test-remove',
      source: 'core',
      navItems: [],
    });
    registeredCodes.push('test-remove');
    expect(registry.getModule('test-remove')).toBeDefined();
    registry.unregisterModule('test-remove');
    expect(registry.getModule('test-remove')).toBeUndefined();
  });

  it('should return all module codes', () => {
    const codes = registry.getAllModuleCodes();
    expect(Array.isArray(codes)).toBe(true);
  });

  it('should group modules by business domain', () => {
    registry.registerModule({
      code: 'test-suite-a',
      name: 'Suite A',
      icon: 'Test',
      path: '/test-suite-a',
      source: 'core',
      suite: 'finance',
      navItems: [],
    });
    registeredCodes.push('test-suite-a');

    registry.registerModule({
      code: 'test-suite-b',
      name: 'Suite B',
      icon: 'Test',
      path: '/test-suite-b',
      source: 'core',
      suite: 'finance',
      navItems: [],
    });
    registeredCodes.push('test-suite-b');

    registry.registerModule({
      code: 'test-suite-c',
      name: 'Suite C',
      icon: 'Test',
      path: '/test-suite-c',
      source: 'core',
      suite: 'hr',
      navItems: [],
    });
    registeredCodes.push('test-suite-c');

    registry.registerModule({
      code: 'test-no-suite',
      name: 'No Suite',
      icon: 'Test',
      path: '/test-no-suite',
      source: 'core',
      navItems: [],
    });
    registeredCodes.push('test-no-suite');

    const grouped = registry.getNavItemsGroupedByBusinessDomain();
    expect(grouped).toBeDefined();
    expect(grouped['finance']).toBeDefined();
    expect(grouped['finance'].length).toBeGreaterThanOrEqual(2);
    expect(grouped['hr']).toBeDefined();
    expect(grouped['other']).toBeDefined();
    expect(grouped['other'].length).toBeGreaterThanOrEqual(1);
  });

  it('should respect permission filter when grouping', () => {
    registry.registerModule({
      code: 'test-perm',
      name: 'Perm Module',
      icon: 'Test',
      path: '/test-perm',
      source: 'core',
      permission: 'admin.view',
      navItems: [],
    });
    registeredCodes.push('test-perm');

    const hasPermission = (perm: string) => perm !== 'admin.view';
    const grouped = registry.getNavItemsGroupedByBusinessDomain(hasPermission);

    // The test-perm module should NOT appear in any group
    const allCards = Object.values(grouped).flat();
    const found = allCards.find((c) => c.code === 'test-perm');
    expect(found).toBeUndefined();
  });

  it('should emit navigationUpdated event on register/unregister', () => {
    const listener = vi.fn();
    registry.emitter.on('navigationUpdated', listener);

    registry.registerModule({
      code: 'test-event',
      name: 'Event Test',
      icon: 'Test',
      path: '/test-event',
      source: 'core',
      navItems: [],
    });
    registeredCodes.push('test-event');
    expect(listener).toHaveBeenCalledWith('test-event');

    registry.unregisterModule('test-event');
    expect(listener).toHaveBeenCalledTimes(2);
    registry.emitter.off('navigationUpdated', listener);
  });
});
