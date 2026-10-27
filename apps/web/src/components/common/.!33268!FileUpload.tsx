import React, { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import i18n from '@/i18n';
import { styled } from '@mui/material/styles';
import {
  File as FileIcon,
  FileText,
  FileImage,
  FileSpreadsheet,
  Upload,
  X,
  Download,
  Check,
  AlertCircle,
  Pause,
  Play,
} from 'lucide-react';
import { designTokens } from '@topems/tokens';

/**
