import React, { lazy, Suspense } from 'react';
import { Box, useTheme, useMediaQuery, CircularProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { glassSx } from '@/theme/effects';
import { HeaderLogo } from './HeaderLogo';
import { HeaderSearch } from './HeaderSearch';
import { HeaderUserMenu } from './HeaderUserMenu';
import { HeaderBreadcrumbs } from './HeaderBreadcrumbs';
import { BusinessDomainTabs } from './BusinessDomainTabs';
import LanguageSelector from '@/components/LanguageSelector';
import { TenantSwitcher } from '@/components/TenantSwitcher/TenantSwitcher';

