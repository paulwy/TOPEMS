import React from 'react';
import { Pagination, Select, SelectItem } from '@nextui-org/react';

export interface PaginationConfig {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  showPageSize?: boolean;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showTotal?: boolean;
  totalItems?: number;
}

export default function PaginationComponent({
  page,
  total,
  pageSize,
  onChange,
  showPageSize = true,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showTotal = true,
  totalItems,
}: PaginationConfig) {
  const startItem = totalItems ? (page - 1) * pageSize + 1 : (page - 1) * pageSize + 1;
  const endItem = totalItems ? Math.min(page * pageSize, totalItems) : page * pageSize;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {showTotal && totalItems && (
        <span className="text-sm text-gray-500">
          显示 {startItem}-{endItem} / 共 {totalItems} 条
        </span>
      )}
      <Pagination
        isCompact
        showControls
        showShadow
        color="primary"
        page={page}
        total={total}
        onChange={onChange}
      />
      {showPageSize && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <Select
            size="sm"
            selectedKeys={[String(pageSize)]}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-20"
          >
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
