import { readFileAsBase64, downloadBase64File, parseFileExtension, getImportModeLabel } from '../../utils/importExport';

describe('importExport utils', () => {
  describe('parseFileExtension', () => {
    test('should return xlsx for .xlsx files', () => {
      expect(parseFileExtension('test.xlsx')).toBe('xlsx');
      expect(parseFileExtension('TEST.XLSX')).toBe('xlsx');
    });

    test('should return xlsx for .xls files', () => {
      expect(parseFileExtension('test.xls')).toBe('xlsx');
      expect(parseFileExtension('TEST.XLS')).toBe('xlsx');
    });

    test('should return csv for other file extensions', () => {
      expect(parseFileExtension('test.csv')).toBe('csv');
      expect(parseFileExtension('test.txt')).toBe('csv');
      expect(parseFileExtension('test')).toBe('csv');
      expect(parseFileExtension('test.docx')).toBe('csv');
    });
  });

  describe('getImportModeLabel', () => {
    test('should return correct labels for import modes', () => {
      expect(getImportModeLabel('create')).toBe('仅创建（跳过已存在）');
      expect(getImportModeLabel('update')).toBe('仅更新');
      expect(getImportModeLabel('create_update')).toBe('创建或更新');
      expect(getImportModeLabel('unknown')).toBe('unknown');
    });
  });

  describe('readFileAsBase64', () => {
    test('should read file as base64', async () => {
      const testContent = 'test content';
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });

      const result = await readFileAsBase64(testFile);

      // Verify we get a base64 string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // Decode and verify content
      const decoded = atob(result);
      expect(decoded).toContain('test content');
    });
  });

  describe('downloadBase64File', () => {
    test('should create download link and click it', () => {
      // Create a real anchor element and spy on its methods
      const mockLink = document.createElement('a');
      const clickSpy = vi.spyOn(mockLink, 'click').mockImplementation(() => {});
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((() => {}) as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((() => {}) as any);

      const base64Data = 'dGVzdCBjb250ZW50'; // base64 of 'test content'
      const filename = 'test.txt';

      downloadBase64File(base64Data, filename);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.href).toContain(base64Data);
      expect(mockLink.download).toBe(filename);
      expect(clickSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      // Restore spies
      vi.restoreAllMocks();
    });
  });
});
