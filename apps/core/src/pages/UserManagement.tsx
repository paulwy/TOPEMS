import React from 'react';
import { Typography, Container } from '@mui/material';

export const UserManagement: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        用户管理
      </Typography>
      <Typography variant="body1">用户管理页面 - 由 Core Remote 模块提供</Typography>
    </Container>
  );
};
