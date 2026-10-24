import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dictTypeApi, dictItemApi, type DictType, type DictItem } from '@/api/system';
import { toggleDictItemStatus } from '@/schemas/admin';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  onConfirm: () => void;
  danger?: boolean;
}
const DEFAULT_NEW_TYPE: Partial<DictType> = {
  code: '',
  name: '',
  category: 'business',
  description: '',
  status: 'active',
};
