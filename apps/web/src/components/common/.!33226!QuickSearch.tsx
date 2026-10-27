import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  InputBase,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Chip,
  Fade,
  ClickAwayListener,
} from '@mui/material';
import i18n from '@/i18n';
import { styled, alpha } from '@mui/material/styles';
import { Search, Clock, X, ArrowRight, TrendingUp, Star } from 'lucide-react';
import { designTokens } from '@topems/tokens';

/**
