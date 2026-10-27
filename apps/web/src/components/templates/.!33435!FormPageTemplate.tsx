import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useFormSections } from './useFormSections';
import { useFormDynamicFields } from './useFormDynamicFields';
import { useFormMisc } from './useFormMisc';
import { iconSm, iconMd, iconLg } from '../sharedStyles';
import type { BoxProps } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Skeleton,
  Alert,
  Collapse,
  FormControl,
  FormLabel,
  FormHelperText,
  Snackbar,
  Alert as MuiAlert,
  Chip,
  LinearProgress,
  Tab,
  Tabs,
  Button,
  Switch,
  Checkbox,
} from '@mui/material';
import i18n from '@/i18n';
import { Grid } from '@/components';
import {
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  FileText,
  Unlock,
} from 'lucide-react';
import {
  useForm,
  Controller,
  FormProvider,
  type UseFormReturn,
  type Resolver,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import type { BreadcrumbItem } from './PageHeader';
import { PageHeader } from './PageHeader';
import FileUpload from '../common/FileUpload';
import ImageUpload from '../common/ImageUpload';
import { logger } from '@/utils/logger';

// ============ 类型定义 ============

/**
