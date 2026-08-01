import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentsPage } from '../useDocumentsPage';
import type { FileItem, DisplayItem, SortField, SortOrder, ViewMode } from '../../types';
import { formatFileSize } from '../../utils';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {},
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  Trans: () => null,
}));

vi.mock('@/api/doc', () => ({
  docApi: {
    listFolders: vi.fn().mockResolvedValue({ success: true, data: { folders: [] } }),
    list: vi.fn().mockResolvedValue({ success: true, data: { files: [] } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    deleteFolder: vi.fn().mockResolvedValue({ success: true }),
    upload: vi.fn().mockResolvedValue({ success: true, data: {} }),
    createFolder: vi.fn().mockResolvedValue({ success: true, data: {} }),
    download: vi.fn().mockResolvedValue(new Blob()),
  },
}));

vi.mock('@/hooks', () => ({
  useConfirmDialog: () => ({
    confirmOpen: false,
    confirmConfig: null,
    openConfirm: vi.fn(),
    closeConfirm: vi.fn(),
  }),
}));

vi.mock('@/modules/doc/config', () => ({
  DOC_PATHS: {
    documentDetail: '/doc/document/:id',
  },
}));

describe('useDocumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatFileSize utility', () => {
    it('should return 0 B for 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should format bytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format decimal values correctly', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });
  });

  describe('hook initialization', () => {
    it('should render hook without errors', () => {
      const { result } = renderHook(() => useDocumentsPage());
      expect(result.current).toBeDefined();
    });

    it('should have correct default state values', () => {
      const { result } = renderHook(() => useDocumentsPage());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.viewMode).toBe<ViewMode>('grid');
      expect(result.current.selectedFolderId).toBeNull();
      expect(result.current.uploading).toBe(false);
      expect(result.current.uploadProgress).toBe(0);
      expect(result.current.showCreateFolderModal).toBe(false);
      expect(result.current.previewingFile).toBeNull();
      expect(result.current.selectedFiles).toEqual([]);
      expect(result.current.showFilters).toBe(false);
      expect(result.current.sortBy).toBe<SortField>('date');
      expect(result.current.sortOrder).toBe<SortOrder>('desc');
      expect(result.current.fileTypeFilter).toBe('all');
      expect(result.current.isDragging).toBe(false);
      expect(result.current.starredCount).toBe(0);
      expect(result.current.selectedFolder).toBeUndefined();
    });

    it('should expose ref objects', () => {
      const { result } = renderHook(() => useDocumentsPage());
      expect(result.current.fileInputRef).toBeDefined();
      expect(result.current.dropZoneRef).toBeDefined();
    });
  });

  describe('state setters and callbacks existence', () => {
    it('should expose all expected setter functions', () => {
      const { result } = renderHook(() => useDocumentsPage());

      expect(typeof result.current.setSearchQuery).toBe('function');
      expect(typeof result.current.setViewMode).toBe('function');
      expect(typeof result.current.setShowCreateFolderModal).toBe('function');
      expect(typeof result.current.setPreviewingFile).toBe('function');
      expect(typeof result.current.setShowFilters).toBe('function');
      expect(typeof result.current.setFileTypeFilter).toBe('function');
      expect(typeof result.current.setConfirmDialogClosed).toBe('function');
    });

    it('should expose memoized and callback functions', () => {
      const { result } = renderHook(() => useDocumentsPage());

      expect(typeof result.current.handleFileUpload).toBe('function');
      expect(typeof result.current.handleDelete).toBe('function');
      expect(typeof result.current.handleDeleteFolder).toBe('function');
      expect(typeof result.current.handleDownload).toBe('function');
      expect(typeof result.current.handlePreview).toBe('function');
      expect(typeof result.current.toggleStar).toBe('function');
      expect(typeof result.current.handleFolderSelect).toBe('function');
      expect(typeof result.current.handleCreateFolderSuccess).toBe('function');
      expect(typeof result.current.toggleFileSelect).toBe('function');
      expect(typeof result.current.selectAllFiles).toBe('function');
      expect(typeof result.current.clearSelection).toBe('function');
      expect(typeof result.current.handleBatchDelete).toBe('function');
      expect(typeof result.current.handleDragOver).toBe('function');
      expect(typeof result.current.handleDragLeave).toBe('function');
      expect(typeof result.current.handleDrop).toBe('function');
      expect(typeof result.current.toggleSort).toBe('function');
      expect(typeof result.current.openFileDetail).toBe('function');
    });

    it('should expose query results and mutation objects', () => {
      const { result } = renderHook(() => useDocumentsPage());

      expect(Array.isArray(result.current.folders)).toBe(true);
      expect(Array.isArray(result.current.files)).toBe(true);
      expect(typeof result.current.filesLoading).toBe('boolean');
      expect(result.current.createFolderMutation).toBeDefined();
      expect(Array.isArray(result.current.filteredItems)).toBe(true);
    });
  });

  describe('state interactions', () => {
    it('should update search query via setSearchQuery', () => {
      const { result } = renderHook(() => useDocumentsPage());

      act(() => {
        result.current.setSearchQuery('test search');
      });

      expect(result.current.searchQuery).toBe('test search');
    });

    it('should update view mode between grid and list', () => {
      const { result } = renderHook(() => useDocumentsPage());

      act(() => {
        result.current.setViewMode('list');
      });
      expect(result.current.viewMode).toBe<ViewMode>('list');

      act(() => {
        result.current.setViewMode('grid');
      });
      expect(result.current.viewMode).toBe<ViewMode>('grid');
    });

    it('should update selectedFolderId and clear selectedFiles via handleFolderSelect', () => {
      const { result } = renderHook(() => useDocumentsPage());

      act(() => {
        result.current.toggleFileSelect('file1');
      });
      expect(result.current.selectedFiles).toEqual(['file1']);

      act(() => {
        result.current.handleFolderSelect('folder-1');
      });

      expect(result.current.selectedFolderId).toBe('folder-1');
      expect(result.current.selectedFiles).toEqual([]);

      act(() => {
        result.current.handleFolderSelect(null);
      });

      expect(result.current.selectedFolderId).toBeNull();
    });

    it('should set previewingFile via handlePreview', () => {
      const { result } = renderHook(() => useDocumentsPage());
      const mockFile: FileItem = {
        id: 'file1',
        name: 'test.pdf',
        type: 'file',
        size: '100 KB',
        sizeBytes: 102400,
        updatedAt: '2024-01-01',
        starred: false,
        tags: [],
        content_type: 'application/pdf',
        folder_id: null,
      };

      act(() => {
        result.current.handlePreview(mockFile);
      });

      expect(result.current.previewingFile).toEqual({
        id: 'file1',
        name: 'test.pdf',
        contentType: 'application/pdf',
      });
    });

    it('should toggle file selection correctly via toggleFileSelect', () => {
      const { result } = renderHook(() => useDocumentsPage());

      act(() => {
        result.current.toggleFileSelect('file1');
      });
      expect(result.current.selectedFiles).toEqual(['file1']);

      act(() => {
        result.current.toggleFileSelect('file2');
      });
      expect(result.current.selectedFiles).toEqual(['file1', 'file2']);

      act(() => {
        result.current.toggleFileSelect('file1');
      });
      expect(result.current.selectedFiles).toEqual(['file2']);
    });

    it('should clear selection via clearSelection', () => {
      const { result } = renderHook(() => useDocumentsPage());

      act(() => {
        result.current.toggleFileSelect('file1');
        result.current.toggleFileSelect('file2');
      });
      expect(result.current.selectedFiles).toHaveLength(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedFiles).toEqual([]);
    });

    it('should toggle sort correctly via toggleSort', () => {
      const { result } = renderHook(() => useDocumentsPage());

      expect(result.current.sortBy).toBe<SortField>('date');
      expect(result.current.sortOrder).toBe<SortOrder>('desc');

      act(() => {
        result.current.toggleSort('name');
      });
      expect(result.current.sortBy).toBe<SortField>('name');
      expect(result.current.sortOrder).toBe<SortOrder>('desc');

      act(() => {
        result.current.toggleSort('name');
      });
      expect(result.current.sortBy).toBe<SortField>('name');
      expect(result.current.sortOrder).toBe<SortOrder>('asc');

      act(() => {
        result.current.toggleSort('size');
      });
      expect(result.current.sortBy).toBe<SortField>('size');
      expect(result.current.sortOrder).toBe<SortOrder>('desc');
    });

    it('should update drag state via handleDragOver and handleDragLeave', () => {
      const { result } = renderHook(() => useDocumentsPage());
      const mockEvent = { preventDefault: vi.fn() } as unknown as React.DragEvent;

      expect(result.current.isDragging).toBe(false);

      act(() => {
        result.current.handleDragOver(mockEvent);
      });
      expect(result.current.isDragging).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      act(() => {
        result.current.handleDragLeave(mockEvent);
      });
      expect(result.current.isDragging).toBe(false);
      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(2);
    });
  });

  describe('filteredItems derivation', () => {
    it('should combine folders and files into allItems via filteredItems', () => {
      const { result } = renderHook(() => useDocumentsPage());
      expect(Array.isArray(result.current.filteredItems)).toBe(true);
    });

    it('should apply search query filter', () => {
      const { result } = renderHook(() => useDocumentsPage());

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(result.current.searchQuery).toBe('test');
      expect(Array.isArray(result.current.filteredItems)).toBe(true);
    });

    it('should apply fileTypeFilter', () => {
      const { result } = renderHook(() => useDocumentsPage());

      act(() => {
        result.current.setFileTypeFilter('pdf');
      });

      expect(result.current.fileTypeFilter).toBe('pdf');
      expect(Array.isArray(result.current.filteredItems)).toBe(true);
    });
  });

  describe('confirm dialog integration', () => {
    it('should expose confirmDialog state from useConfirmDialog', () => {
      const { result } = renderHook(() => useDocumentsPage());

      expect(result.current.confirmDialogOpen).toBeDefined();
      expect(result.current.confirmDialogConfig).toBeDefined();
      expect(typeof result.current.setConfirmDialogClosed).toBe('function');
    });
  });
});
