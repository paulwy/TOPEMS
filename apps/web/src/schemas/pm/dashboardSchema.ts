import { dashboardApi } from '@/api/pm/dashboard';
import type { PmStatistics } from '@/api/pm/types';
import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import i18n from '@/i18n';

let pmStats: PmStatistics | undefined;
