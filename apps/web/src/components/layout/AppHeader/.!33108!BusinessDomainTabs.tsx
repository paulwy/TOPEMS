import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation';
import { SUITE_GROUPS } from '@/lib/navigation/types';
import type { ModuleCardConfig, ModuleSuite } from '@/lib/navigation/types';
import { TabGroup, type TabItem } from '@/components/ui/Tabs';
import { renderIcon } from '@/lib/iconMapping';
import i18n from '@/i18n';

interface BusinessDomainTabsProps {
  /** 权限校验函数（透传 usePermission().checkPermission） */
  checkPermission?: (permission: string) => boolean;
  /** 默认业务域（无路径匹配时的兜底高亮） */
  defaultDomain?: ModuleSuite | 'other';
  /** 是否允许未标注模块归入“其他”域，默认 true */
  includeOther?: boolean;
}

/**
