import React, { useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  url?: string;
}

export interface FileUploadProps {
  /** 已上传文件列表 */
  value?: UploadFile[];
  /** 文件列表变化回调 */
  onChange?: (files: UploadFile[]) => void;
  /** 接受的文件类型 */
  accept?: string;
  /** 是否支持多选 */
  multiple?: boolean;
  /** 最大文件数 */
  maxCount?: number;
  /** 最大文件大小（MB） */
  maxSize?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示文件列表 */
  showFileList?: boolean;
