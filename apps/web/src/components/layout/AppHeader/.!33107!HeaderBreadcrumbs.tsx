import { designTokens } from '@topems/tokens';
import React, { useMemo, useSyncExternalStore } from 'react';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import { Home, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { navigationRegistryV2 } from '@/lib/navigation';
import { SUITE_GROUPS } from '@/lib/navigation/types';
import type { NavItem, ModuleSuite } from '@/lib/navigation/types';
import { renderIcon } from '@/lib/iconMapping';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n, { subscribeResourceVersion, getResourceVersion } from '@/i18n';

