import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material';
import { Button } from '@mui/material';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  FileText,
  Users,
  Eye,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WorkflowInstance, Workflow } from '@/api/flow';
import { flowApi } from '@/api/flow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates/ListPageTemplate';

const FlowInstanceListPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [instances, setInstances] = useState