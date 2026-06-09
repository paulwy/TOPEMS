import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
  Tooltip,
} from '@nextui-org/react';
import { SearchIcon, PlusIcon, FilterIcon, DownloadIcon } from '@/components/icons';
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
  onRowClick,
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
        }),
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
    [onSelectionChange],
  );

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-3 items-center mb-4">
        {showSearch && (
          <Input
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            startContent={<SearchIcon className="text-default-400" />}
            className="w-64"
          />
        )}
        {showFilters && (
          <Tooltip content="筛选">
            <Button isIconOnly variant="flat">
              <FilterIcon />
            </Button>
          </Tooltip>
        )}
        {showExport && (
          <Tooltip content="导出">
            <Button isIconOnly variant="flat" onPress={handleExport}>
              <DownloadIcon />
            </Button>
          </Tooltip>
        )}
        {onCreateNew && (
          <Button color="primary" startContent={<PlusIcon />} onPress={onCreateNew}>
            {createNewLabel}
          </Button>
        )}
        {extraActions}
      </div>

      <Table
        aria-label="Data table"
        isStriped
        selectionMode={showSelection ? 'multiple' : 'none'}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
        onRowClick={onRowClick ? (row) => onRowClick(row as unknown as T) : undefined}
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.key}
              align={column.align || 'start'}
              allowsSorting={column.sortable}
              width={column.width}
            >
              {column.sortable ? (
                <button onClick={() => handleSort(column.key)} className="flex items-center gap-1">
                  {column.label}
                  {sortConfig?.key === column.key && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ) : (
                column.label
              )}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody items={paginatedData} emptyContent={emptyMessage}>
          {(row, index) => (
            <TableRow key={getRowKey(row)}>
              {(column) => (
                <TableCell key={column.key}>
                  {column.render ? column.render(row, index) : String(row[column.key] ?? '')}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {showPagination && pageCount > 1 && (
        <div className="flex justify-center mt-4">
          <PaginationComponent
            page={currentPage}
            total={pageCount}
            pageSize={pageSize}
            onChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
