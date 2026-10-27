import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { Pin, PinOff, X, GripVertical, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationRegistryV2 } from '../../lib/navigation';
import type { NavItem } from '../../lib/navigation/types';
import { designTokens } from '@topems/tokens';

