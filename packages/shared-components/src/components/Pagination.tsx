import { Box, Typography, Select, MenuItem, FormControl, Button } from '@mui/material';
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
    const pages: (number | string)[] = [];
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
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
      {showTotal && totalItems && (
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          显示 {startItem}-{endItem} / 共 {totalItems} 条
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          onClick={() => onChange(1)}
          disabled={page === 1}
          sx={{
            p: 2,
            borderRadius: 2,
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'grey.100' },
            '&:disabled': {
              opacity: 0.5,
              cursor: 'not-allowed',
            },
          }}
          title='第一页'
        >
          <ChevronsLeft style={{ width: 16, height: 16 }} />
        </Button>
        <Button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          sx={{
            p: 2,
            borderRadius: 2,
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'grey.100' },
            '&:disabled': {
              opacity: 0.5,
              cursor: 'not-allowed',
            },
          }}
          title='上一页'
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </Button>
        {getPageNumbers().map((pageNum, index) =>
          pageNum === '...' ? (
            <Typography
              key={index}
              sx={{ px: 2, color: 'text.disabled' }}
            >
              ...
            </Typography>
          ) : (
            <Button
              key={index}
              onClick={() => onChange(pageNum as number)}
              sx={{
                minWidth: 32,
                height: 32,
                px: 3,
                borderRadius: 2,
                fontSize: '0.875rem',
                fontWeight: 500,
                backgroundColor: page === pageNum ? 'primary.dark' : 'transparent',
                color: page === pageNum ? 'white' : 'text.secondary',
                '&:hover': {
                  backgroundColor: page === pageNum ? 'primary.dark' : 'grey.100',
                },
              }}
            >
              {pageNum}
            </Button>
          )
        )}
        <Button
          onClick={() => onChange(page + 1)}
          disabled={page === total}
          sx={{
            p: 2,
            borderRadius: 2,
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'grey.100' },
            '&:disabled': {
              opacity: 0.5,
              cursor: 'not-allowed',
            },
          }}
          title='下一页'
        >
          <ChevronRight style={{ width: 16, height: 16 }} />
        </Button>
        <Button
          onClick={() => onChange(total)}
          disabled={page === total}
          sx={{
            p: 2,
            borderRadius: 2,
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'grey.100' },
            '&:disabled': {
              opacity: 0.5,
              cursor: 'not-allowed',
            },
          }}
          title='最后一页'
        >
          <ChevronsRight style={{ width: 16, height: 16 }} />
        </Button>
      </Box>
      {showPageSize && onPageSizeChange && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>每页</Typography>
          <FormControl size='small'>
            <Select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              sx={{
                height: 32,
                fontSize: '0.875rem',
              }}
            >
              {pageSizeOptions.map((size) => (
                <MenuItem
                  key={size}
                  value={size}
                >
                  {size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
}
