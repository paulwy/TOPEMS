import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { CrmDashboardStats } from '@/api/crm/dashboard';
import i18n from '@/i18n';

let crmStats: CrmDashboardStats | undefined;
