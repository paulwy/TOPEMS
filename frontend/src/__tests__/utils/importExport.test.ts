import {
  readFileAsBase64,
  downloadBase64File,
  parseFileExtension,
  getImportModeLabel,
} from '../../utils/importExport';

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
      // Mock document.createElement and appendChild/removeChild
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation();
      jest.spyOn(document.body, 'removeChild').mockImplementation();

      const base64Data = 'dGVzdCBjb250ZW50'; // base64 of 'test content'
      const filename = 'test.txt';

      downloadBase64File(base64Data, filename);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toContain(base64Data);
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();

      // Restore spies
      jest.restoreAllMocks();
    });
  });
});
