import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { templateApi, type Template, type CreateTemplateRequest } from '@/api/template';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useCrudMutations } from '@/hooks';

import { QUERY_KEYS } from '@/lib/reactQuery';
