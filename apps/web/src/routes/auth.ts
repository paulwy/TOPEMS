import React, { lazy } from 'react';
import { createSafeLazy, type RouteConfig } from './utils';

const safeLazy = createSafeLazy();

const LoginPage = safeLazy(() => import('../pages/shared/LoginPage'));
const ForgotPasswordPage = safeLazy(() => import('../pages/shared/ForgotPasswordPage'));

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
