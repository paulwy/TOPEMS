/**
 * MobileQuality state management and API calls hook
 * @refactor-split Extracted from MobileQualityPage.tsx
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useNotificationStore } from '@/store';
import { type QualityTask, type DefectRecord } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export interface DefectForm {
  defect_type: string;
  severity: DefectRecord['severity'];
  quantity: number;
  description: string;
}
type TaskAction = 'start' | 'pass' | 'fail';
export type ChipColor = 'warning' | 'primary' | 'success' | 'error' | 'info' | 'default';
type SeverityChipColor = 'warning' | 'error' | 'default';
