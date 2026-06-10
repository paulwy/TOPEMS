import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 2) {
        pages.push(1, 2, 3, '...', total);
      } else if (page >= total - 1) {
        pages.push(1, '...', total - 2, total - 1, total);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', total);
      }
    }
    return pages;
  };

  return (
    <div className='flex flex-wrap items-center gap-4'>
      {showTotal && totalItems && (
        <span className='text-sm text-gray-500'>
          显示 {startItem}-{endItem} / 共 {totalItems} 条
        </span>
      )}
      <nav className='flex items-center gap-1'>
        <button
          onClick={() => onChange(1)}
          disabled={page === 1}
          className='p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          title='第一页'
        >
          <ChevronsLeft className='w-4 h-4' />
        </button>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className='p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          title='上一页'
        >
          <ChevronLeft className='w-4 h-4' />
        </button>
        {getPageNumbers().map((pageNum, index) =>
          pageNum === '...' ? (
            <span key={index} className='px-2 text-gray-400'>
              ...
            </span>
          ) : (
            <button
              key={index}
              onClick={() => onChange(pageNum as number)}
              className={`min-w-[32px] h-8 px-3 rounded-lg text-sm font-medium transition-colors ${
                page === pageNum ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === total}
          className='p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          title='下一页'
        >
          <ChevronRight className='w-4 h-4' />
        </button>
        <button
          onClick={() => onChange(total)}
          disabled={page === total}
          className='p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          title='最后一页'
        >
          <ChevronsRight className='w-4 h-4' />
        </button>
      </nav>
      {showPageSize && onPageSizeChange && (
        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-500'>每页</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className='h-8 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
