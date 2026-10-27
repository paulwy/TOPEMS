import React, { type ErrorInfo, type ReactNode } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Code2,
  Home,
  ArrowLeft,
  Copy,
  ChevronDown,
  ChevronUp,
  Bug,
  FileX,
  Layers,
} from 'lucide-react';
import i18n from '@/i18n';
import createLogger from '../utils/logger';
import { designTokens } from '@topems/tokens';

const logger = createLogger('ErrorBoundary');

