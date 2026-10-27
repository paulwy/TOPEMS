import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, type PageHeaderProps } from '../layout';
import { Button } from '../primitives';

export interface FormPageTemplateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  header: PageHeaderProps;
  children: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  actions?: React.ReactNode;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const FormPageTemplate: React.FC<FormPageTemplateProps> = ({
  header,
  children,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  loading = false,
  actions,
  className,
  style,
