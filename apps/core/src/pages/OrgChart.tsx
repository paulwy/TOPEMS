import React from 'react';
import { Typography, Container } from '@mui/material';

export const OrgChart: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        组织架构
      </Typography>
      <Typography variant="body1">组织架构页面 - 由 Core Remote 模块提供</Typography>
    </Container>
  );
};
