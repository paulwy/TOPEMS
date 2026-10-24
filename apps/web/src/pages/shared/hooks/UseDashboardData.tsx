/**
 * @done V79 Phase 2 split
 * Extracted from DashboardPage.tsx - centralizes all dashboard data fetching,
 * derived state, and BFF mutation handlers.
 *
 * Return structure:
 *   - Data: stats / moduleStats / chartData / recentActivities / todos / pendingTodos / completedTodos
 *   - Loading: loading (combined) + individual query objects
 *   - Auth context: user / isAuthenticated / hasPermission / checkPermission
 *   - Handlers: getGreeting / handleTodoToggle
 */
import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import { docApi } from '@/api/doc';
import { workflowApi } from '@/api/workflow';
import { qmsApi, useQmsMock, type QmsMockShape } from '@/api/qms';
import { ehsApi } from '@/api/ehs';
import { srmApi } from '@/api/srm';
import { limsApi } from '@/api/lims';
import { rdApi } from '@/api/rd';
import { biApi } from '@/api/bi';
import { scmApi } from '@/api/scm';
import { getDashboard, completeTodoGql } from '@/api/bff';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import type { ActivityItem } from '@/components/dashboard';
import { User, FileText, GitBranch, Folder } from 'lucide-react';

interface EhsHazard {
  id: string;
  status: string;
}

interface BiMetric {
  title: string;
  value: number;
  icon?: string;
}

interface FlowMonthlyData {
  month: string;
  instances_started?: number;
  approvals_processed?: number;
}

interface AuditLog {
  id: string;
  action?: string;
  module?: string;
  created_at: string;
}
