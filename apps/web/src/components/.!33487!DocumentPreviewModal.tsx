import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material';
import { X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { docApi } from '../api/doc';
import { logger } from '@/utils/logger';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  contentType: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  fileId,
  fileName,
  contentType,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadAndPreview = async () => {
      logger.info(i18n.t('components.document_preview_modal.k0'), {
        fileName,
        contentType,
        fileId,
      });

      if (!containerRef.current) {
        logger.error(i18n.t('components.document_preview_modal.null_0'));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const container = containerRef.current;
        container.innerHTML = '';
        logger.info(i18n.t('components.document_preview_modal.k1'));

        if (contentType.includes('image/')) {
          logger.info(i18n.t('components.document_preview_modal.k2'));
          const imgUrl = await docApi.preview(fileId);
          const img = document.createElement('img');
          img.src = imgUrl;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '80vh';
          img.style.margin = 'auto';
          img.alt = fileName;
          container.appendChild(img);
        } else if (contentType.includes('application/pdf')) {
          logger.info(i18n.t('components.document_preview_modal.pdf_3'));
          const blob = await docApi.download(fileId);
          logger.info(i18n.t('components.document_preview_modal.k1'), blob.size);
          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;
          const iframe = document.createElement('iframe');
          iframe.src = blobUrl;
          iframe.style.width = '100%';
          iframe.style.height = '80vh';
          iframe.style.border = '0';
          iframe.onload = () => {
            logger.info('PDF iframe loaded');
          };
          iframe.onerror = (e) => {
            logger.error('PDF iframe error:', e);
            if (blobUrlRef.current) {
              URL.revokeObjectURL(blobUrlRef.current);
              blobUrlRef.current = null;
            }
          };
          container.appendChild(iframe);
        } else if (fileName.endsWith('.docx')) {
          logger.info(i18n.t('components.document_preview_modal.docx_4'));
          const blob = await docApi.download(fileId);
          logger.info(
            i18n.t('components.document_preview_modal.blob_2'),
            blob.size,
            i18n.t('components.document_preview_modal.k3'),
            blob.type
          );

