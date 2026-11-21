import { createSafeLazy, type RouteConfig } from './utils';

export const AUTH_PATHS = {
  login: '/login',
  forgotPassword: '/forgot-password',
  forceChangePassword: '/force-change-password',
} as const;

const safeLazy = createSafeLazy();

const LoginPage = safeLazy(() => import('../components/shared/LoginPage'));
const ForgotPasswordPage = safeLazy(() => import('../components/shared/ForgotPasswordPage'));
const ForceChangePasswordPage = safeLazy(
  () => import('../components/shared/ForceChangePasswordPage')
);

export const authRoutes: RouteConfig[] = [
  {
    path: AUTH_PATHS.login,
    element: LoginPage,
  },
  {
    path: AUTH_PATHS.forgotPassword,
    element: ForgotPasswordPage,
  },
  {
    path: AUTH_PATHS.forceChangePassword,
    element: ForceChangePasswordPage,
  },
];
