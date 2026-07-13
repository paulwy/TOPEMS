import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.getState().reset();
  });

  it('should initialize with light mode', () => {
    const store = useThemeStore.getState();
    expect(store.mode).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    const { toggleTheme } = useThemeStore.getState();
    
    toggleTheme();
    
    const store = useThemeStore.getState();
    expect(store.mode).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    const { toggleTheme } = useThemeStore.getState();
    
    toggleTheme();
    toggleTheme();
    
    const store = useThemeStore.getState();
    expect(store.mode).toBe('light');
  });

  it('should set theme directly', () => {
    const { setTheme } = useThemeStore.getState();
    
    setTheme('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
    
    setTheme('light');
    expect(useThemeStore.getState().mode).toBe('light');
  });
});