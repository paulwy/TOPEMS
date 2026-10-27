import React from 'react';
import { Box, Typography } from '@mui/material';
import { BackButton } from '@topems/shared-components';

interface ListPageHeaderProps {
  backButton?: {
    onClick?: () => void;
    href?: string;
  };
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}

/**
