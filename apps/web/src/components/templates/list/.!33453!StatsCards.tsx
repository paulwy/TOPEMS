import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface StatsCardItem {
  key: string;
  label: string;
  value?: number | string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  icon?: React.ReactNode;
}

interface StatsCardsProps {
  cards: StatsCardItem[];
}

/**
