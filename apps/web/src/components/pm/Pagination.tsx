import { Box } from '@mui/material';
import { Button } from '@mui/material';
import React from 'react';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}) => {
  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
      }}
    >
      <Button
        variant='outlined'
        size='small'
        disabled={disabled || currentPage === 1}
        onClick={() => onPageChange(1)}
        sx={{ minWidth: '32px', height: '32px', padding: '4px' }}
      >
        <ChevronsLeft size={16} />
      </Button>
      <Button
        variant='outlined'
        size='small'
        disabled={disabled || currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        sx={{ minWidth: '32px', height: '32px', padding: '4px' }}
      >
        <ChevronLeft size={16} />
      </Button>

      {pages.map((page, index) => (
        <Button
          key={index}
          variant={page === currentPage ? 'contained' : 'outlined'}
          size='small'
          disabled={disabled || typeof page === 'string'}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          sx={
            page === currentPage
              ? {
                  minWidth: '36px',
                  height: '32px',
                  backgroundColor: 'primary.dark',
                  '&:hover': { backgroundColor: 'primary.dark' },
                  color: 'white',
                }
              : { minWidth: '36px', height: '32px' }
          }
        >
          {page}
        </Button>
      ))}

      <Button
        variant='outlined'
        size='small'
        disabled={disabled || currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        sx={{ minWidth: '32px', height: '32px', padding: '4px' }}
      >
        <ChevronRight size={16} />
      </Button>
      <Button
        variant='outlined'
        size='small'
        disabled={disabled || currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
        sx={{ minWidth: '32px', height: '32px', padding: '4px' }}
      >
        <ChevronsRight size={16} />
      </Button>
    </Box>
  );
};

export default Pagination;
