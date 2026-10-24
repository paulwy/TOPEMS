import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { WmsDashboardStats } from '@/api/wms/dashboard';
import i18n from '@/i18n';

let wmsStats: WmsDashboardStats | undefined;
