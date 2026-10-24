import { financeApi } from '@/api/finance';
import type { FinanceDashboardStats } from '@/api/finance';
import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import { useTranslation } from 'react-i18next';

let financeStats: FinanceDashboardStats | undefined;
