import React, { useState, useMemo, useCallback } from 'react';
import { Search, Plus, Filter, Download } from 'lucide-react';
import PaginationComponent from './Pagination';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: number | string;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableConfig<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  total?: number;
  pageSize?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  showSelection?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  onExport?: (data: T[]) => void;
  onSelectionChange?: (keys: Set<string>) => void;
  onCreateNew?: () => void;
  createNewLabel?: string;
  extraActions?: React.ReactNode;
  getRowKey?: (row: T) => string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  total,
  pageSize = 10,
  showSearch = true,
  showFilters = true,
  showExport = true,
  showSelection = false,
  showPagination = true,
  emptyMessage = '暂无数据',
  searchPlaceholder = '搜索...',
  onExport,
  onSelectionChange,
  onCreateNew,
  createNewLabel = '新建',
  extraActions,
  getRowKey = (row: T) => row.id?.toString() || row.key || Math.random().toString(),
}: DataTableConfig<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const processedData = useMemo(() => {
    let result = [...data];

    if (searchText) {
      const searchableKeys = columns.filter((c) => c.searchable !== false).map((c) => c.key);
      result = result.filter((row) =>
        searchableKeys.some((key) => {
          const value = row[key];
          return value?.toString().toLowerCase().includes(searchText.toLowerCase());
        })
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchText, sortConfig, columns]);

  const paginatedData = useMemo(() => {
    if (!showPagination) return processedData;
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize, showPagination]);

  const pageCount = useMemo(() => {
    if (!showPagination) return 1;
    return Math.ceil((total || processedData.length) / pageSize);
  }, [total, processedData.length, pageSize, showPagination]);

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(processedData);
    } else {
      const headers = columns.map((c) => c.label);
      const rows = processedData.map((row) => columns.map((c) => row[c.key] ?? ''));
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'export.csv';
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [processedData, columns, onExport]);

  const handleSelectionChange = useCallback(
    (keys: Set<string>) => {
      setSelectedKeys(keys);
      onSelectionChange?.(keys);
    },
    [onSelectionChange]
  );

  return (
    <div className='w-full'>
      <div className='flex flex-wrap gap-3 items-center mb-4'>
        {showSearch && (
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className='w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
        )}
        {showFilters && (
          <button className='p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors' title='筛选'>
            <Filter className='w-4 h-4' />
          </button>
        )}
        {showExport && (
          <button
            className='p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
            title='导出'
            onClick={handleExport}
          >
            <Download className='w-4 h-4' />
          </button>
        )}
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
          >
            <Plus className='w-4 h-4' />
            {createNewLabel}
          </button>
        )}
        {extraActions}
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full border-collapse'>
          <thead>
            <tr className='bg-gray-50'>
              {showSelection && (
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  <input
                    type='checkbox'
                    checked={selectedKeys.size === processedData.length && processedData.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allKeys = new Set(processedData.map((row) => getRowKey(row)));
                        handleSelectionChange(allKeys);
                      } else {
                        handleSelectionChange(new Set());
                      }
                    }}
                    className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className='flex items-center gap-1 hover:text-gray-700'
                    >
                      {column.label}
                      {sortConfig?.key === column.key && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showSelection ? 1 : 0)} className='px-4 py-8 text-center text-gray-500'>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr key={getRowKey(row)} className='hover:bg-gray-50'>
                  {showSelection && (
                    <td className='px-4 py-3'>
                      <input
                        type='checkbox'
                        checked={selectedKeys.has(getRowKey(row))}
                        onChange={(e) => {
                          const newKeys = new Set(selectedKeys);
                          if (e.target.checked) {
                            newKeys.add(getRowKey(row));
                          } else {
                            newKeys.delete(getRowKey(row));
                          }
                          handleSelectionChange(newKeys);
                        }}
                        className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className='px-4 py-3 text-sm text-gray-900'>
                      {column?.render ? column.render(row, index) : String(row[column.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && pageCount > 1 && (
        <div className='flex justify-center mt-4'>
          <PaginationComponent page={currentPage} total={pageCount} pageSize={pageSize} onChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
