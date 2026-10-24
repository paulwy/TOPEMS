import { qualityDashboardApi } from '@/api/qms';
import type { QualityOverview } from '@/api/qms/types';
import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import i18n from '@/i18n';

let qmsStats: QualityOverview | undefined;
