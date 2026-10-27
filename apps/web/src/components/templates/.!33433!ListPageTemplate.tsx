import { iconSm, iconMd, iconLg } from '../sharedStyles';
import { ListPageHeader } from './ListPageHeader';
import { useListPageForm } from './useListPageForm';
import { useListPageSortSearch } from './useListPageSortSearch';
import { useListPageSelection } from './useListPageSelection';
import { useListPageMisc } from './useListPageMisc';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  IconButton,
  Tooltip,
  Checkbox,
  Skeleton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  FormHelperText,
  Radio,
  RadioGroup,
  FormGroup,
} from '@mui/material';
import i18n from '@/i18n';
import {
  AlertTriangle as WarningIcon,
  MoreHorizontal,
  ChevronRight,
  Columns3,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { EmptyState, ErrorEmptyState, BackButton } from '@topems/shared-components';
import {
  useListPageState,
  useUrlListState,
  useCrudOperations,
  useColumnConfig,
  useColumnWidth,
  useUrlState,
} from '@/hooks';
import type { CrudOperations } from '@/hooks';
import { logger } from '@/utils/logger';
import { mapListParamsToBackend } from '@/utils/listParamMapping';
import { FormDialog, FormDrawer } from '@/components/common';
