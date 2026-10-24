import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { HrmDashboardStats } from '@/api/hrm/dashboard';
import i18n from '@/i18n';

let hrmStats: HrmDashboardStats | undefined;
