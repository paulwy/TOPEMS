import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const LoginPage = lazy(() => import('../pages/shared/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../pages/shared/ForgotPasswordPage'));

export const authRoutes: RouteConfig[] = [
  {
    path: '/login',
    element: LoginPage,
  },
  {
    path: '/forgot-password',
    element: ForgotPasswordPage,
  },
];
