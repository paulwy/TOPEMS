import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../primitives';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  code?: string | number;
  title?: string;
  message?: string;
  traceId?: string;
  onRetry?: () => void;
  onFeedback?: () => void;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      code = 500,
      title,
      message,
      traceId,
      onRetry,
      onFeedback,
      className,
      style,
