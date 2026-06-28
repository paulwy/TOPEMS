import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatFileSize,
} from '../number';

describe('number utilities', () => {
  describe('formatCurrency', () => {
    it('should format CNY currency by default', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1,234.56');
    });

    it('should format USD currency', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toBeDefined();
    });

    it('should handle negative numbers', () => {
      const result = formatCurrency(-1234.56);
      expect(result).toBeDefined();
    });

    it('should handle unknown currency code', () => {
      const result = formatCurrency(1234.56, 'UNKNOWN');
      expect(result).toBe('1234.56');
    });
  });

  describe('formatNumber', () => {
    it('should format number with default 0 decimals', () => {
      expect(formatNumber(1234)).toBe('1,234');
    });

    it('should format number with specified decimals', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57');
      expect(formatNumber(1234.5, 3)).toBe('1,234.500');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(0, 2)).toBe('0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1,234');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1536)).toBe('1.50 KB');
      expect(formatFileSize(2048)).toBe('2.00 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.00 MB');
      expect(formatFileSize(1572864)).toBe('1.50 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.00 GB');
      expect(formatFileSize(1610612736)).toBe('1.50 GB');
    });

    it('should format terabytes', () => {
      expect(formatFileSize(1099511627776)).toBe('1.00 TB');
    });
  });
});