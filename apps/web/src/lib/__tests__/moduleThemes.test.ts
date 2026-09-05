import { describe, it, expect } from 'vitest';
import { getModuleThemes, getModuleTheme, getModuleThemeFromPath } from '../moduleThemes';

describe('lib/moduleThemes', () => {
  describe('moduleThemes data', () => {
    it('contains entries for all core modules', () => {
      const coreCodes = [
        'iam',
        'workflow',
        'notification',
        'docs',
        'report',
        'monitor',
        'integration',
        'ai',
      ];
      coreCodes.forEach((code) => {
        expect(getModuleThemes()[code]).toBeDefined();
        expect(getModuleThemes()[code].code).toBe(code);
      });
    });

    it('contains entries for business modules', () => {
      const bizCodes = [
        'crm',
        'erp',
        'wms',
        'mes',
        'qms',
        'hrm',
        'finance',
        'scm',
        'pm',
        'lims',
        'bi',
      ];
      bizCodes.forEach((code) => {
        expect(getModuleThemes()[code]).toBeDefined();
      });
    });

    it('every entry has code, name, icon, gradient, and color', () => {
      Object.entries(getModuleThemes()).forEach(([key, theme]) => {
        expect(theme.code).toBe(key);
        expect(typeof theme.name).toBe('string');
        expect(theme.name.length).toBeGreaterThan(0);
        expect(theme.icon).toBeDefined();
        expect(typeof theme.gradient).toBe('string');
        expect(theme.gradient).toContain('linear-gradient');
        expect(typeof theme.color).toBe('string');
        expect(theme.color).toMatch(/^#|var\(/);
      });
    });

    it('all gradient strings use 135deg', () => {
      Object.values(getModuleThemes()).forEach((theme) => {
        expect(theme.gradient).toContain('135deg');
      });
    });
  });

  describe('getModuleTheme', () => {
    it('returns theme for valid module code', () => {
      const theme = getModuleTheme('iam');
      expect(theme).toBeDefined();
      expect(theme?.code).toBe('iam');
      expect(theme?.name).toBe('module_themes.iam');
    });

    it('is case-insensitive', () => {
      expect(getModuleTheme('IAM')).toBeDefined();
      expect(getModuleTheme('CRM')).toBeDefined();
      expect(getModuleTheme('HrM')).toBeDefined();
      expect(getModuleTheme('IAM')?.code).toBe('iam');
    });

    it('returns undefined for unknown module code', () => {
      expect(getModuleTheme('nonexistent')).toBeUndefined();
      expect(getModuleTheme('')).toBeUndefined();
    });
  });

  describe('getModuleThemeFromPath', () => {
    it('extracts module from simple pathname', () => {
      const theme = getModuleThemeFromPath('/iam/users');
      expect(theme).toBeDefined();
      expect(theme?.code).toBe('iam');
    });

    it('extracts module from pathname with no sub-path', () => {
      const theme = getModuleThemeFromPath('/crm');
      expect(theme?.code).toBe('crm');
    });

    it('extracts module from deep pathname', () => {
      const theme = getModuleThemeFromPath('/hrm/employees/123/edit');
      expect(theme?.code).toBe('hrm');
    });

    it('returns undefined for root path', () => {
      expect(getModuleThemeFromPath('/')).toBeUndefined();
    });

    it('returns undefined for empty path', () => {
      expect(getModuleThemeFromPath('')).toBeUndefined();
    });

    it('returns undefined for unknown module in path', () => {
      expect(getModuleThemeFromPath('/unknown/page')).toBeUndefined();
    });

    it('handles paths with trailing slashes', () => {
      const theme = getModuleThemeFromPath('/workflow/');
      expect(theme?.code).toBe('workflow');
    });

    it('handles paths with multiple leading slashes', () => {
      const theme = getModuleThemeFromPath('///ai/chat');
      expect(theme?.code).toBe('ai');
    });
  });
});
