import React from 'react';
import { Typography, Container } from '@mui/material';

export const RoleManagement: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        角色管理
      </Typography>
      <Typography variant="body1">角色管理页面 - 由 Core Remote 模块提供</Typography>
    </Container>
  );
};
