import { Box, Typography, CircularProgress } from '@mui/material';

export default function ComingSoon() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography
        variant='h6'
        color='text.secondary'
      >
        页面开发中...
      </Typography>
    </Box>
  );
}
