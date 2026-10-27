import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  loading?: boolean;
  emptyMessage?: string;

