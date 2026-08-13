import React from 'react';
import { Box } from '@mui/material';
import GlobalSearchBar from '../../GlobalSearchBar';

export const HeaderSearch: React.FC = () => {
  return (
    <>
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: 480,
          flexShrink: 0,
          mx: 2,
        }}
      >
        <GlobalSearchBar />
      </Box>
      <Box sx={{ display: { xs: 'flex', lg: 'none' } }}>
        <GlobalSearchBar variant='icon' />
      </Box>
    </>
  );
};

export default HeaderSearch;
