import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { financeReportApi } from '@/api/finance';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/api/erp/types';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export interface PeriodOption {
  value: string;
  label: string;
}
export interface TabConfig {
  label: string;
  value: string;
}
