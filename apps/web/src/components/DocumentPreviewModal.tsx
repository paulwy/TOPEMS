import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material';
import { X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { docApi } from '../api/doc';
import { logger } from '@/utils/logger';

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
      logger.info('开始预览:', { fileName, contentType, fileId });

      if (!containerRef.current) {
        logger.error('容器引用为 null');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const container = containerRef.current;
        container.innerHTML = '';
        logger.info('容器已清空');

        if (contentType.includes('image/')) {
          logger.info('预览图片');
          const imgUrl = await docApi.preview(fileId);
          const img = document.createElement('img');
          img.src = imgUrl;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '80vh';
          img.style.margin = 'auto';
          img.alt = fileName;
          container.appendChild(img);
        } else if (contentType.includes('application/pdf')) {
          logger.info('预览 PDF');
          const blob = await docApi.download(fileId);
          logger.info('获取到 PDF Blob，大小:', blob.size);
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
          logger.info('预览 DOCX');
          const blob = await docApi.download(fileId);
          logger.info('获取到 Blob，大小:', blob.size, '类型:', blob.type);

          // 检查 blob 内容
          const text = await blob.text();
          logger.info('Blob 内容前 100 字符:', text.substring(0, 100));

          // 如果内容不是以 PK (ZIP 头) 开头，说明返回了错误
          const bytes = await blob.arrayBuffer();
          const view = new DataView(bytes);
          const header =
            String.fromCharCode(view.getUint8(0)) + String.fromCharCode(view.getUint8(1));
          logger.info('文件头:', header, "(应该是 'PK')");

          if (header !== 'PK') {
            throw new Error(`文件格式错误：期望 DOCX (ZIP)，实际得到 ${blob.type || 'unknown'}`);
          }

          // 动态导入 docx-preview (这是一个较大的库，仅在需要预览 docx 时加载)
          if (containerRef.current) {
            logger.info('开始动态导入 docx-preview');
            const { renderAsync } = await import('docx-preview');
            logger.info('开始调用 docx-preview renderAsync');
            await renderAsync(blob, containerRef.current);
            logger.info('DOCX 渲染完成');
          }
        } else if (
          contentType.includes('text/') ||
          fileName.endsWith('.md') ||
          fileName.endsWith('.txt')
        ) {
          logger.info('预览文本/Markdown');
          const blob = await docApi.download(fileId);
          const text = await blob.text();
          logger.info('获取到文本内容，长度:', text.length);
          const pre = document.createElement('pre');
          pre.textContent = text;
          pre.style.whiteSpace = 'pre-wrap';
          pre.style.padding = '16px';
          pre.style.backgroundColor = 'grey.50';
          pre.style.borderRadius = '8px';
          pre.style.overflow = 'auto';
          pre.style.maxHeight = '80vh';
          pre.style.fontFamily = 'monospace';
          pre.style.fontSize = '14px';
          container.appendChild(pre);
        } else {
          logger.info('不支持的文件类型');
          setError(`不支持直接预览 ${fileName}，请下载后查看`);
        }
      } catch (err: unknown) {
        logger.error('Preview error:', err);
        setError(
          `预览失败: ${err instanceof Error ? (err as { message?: string }).message : '未知错误'}`
        );
      } finally {
        setLoading(false);
      }
    };

    // 延迟一点确保 DOM 已渲染
    const timer = setTimeout(loadAndPreview, 200);

    return () => {
      clearTimeout(timer);
      // 清理 blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isOpen, fileId, fileName, contentType]);

  useEffect(() => {
    return () => {
      // 组件卸载时清理 blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'action.active',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 4,
      }}
    >
      <div
        style={{
          backgroundColor: 'common.white',
          borderRadius: 'lg',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '1024px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 4,
            borderBottom: '1px solid grey.200',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <FileText sx={{ width: 24, height: 24, color: 'primary.dark' }} />
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: theme.palette.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fileName}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 2,
              borderRadius: 'md',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            <X sx={{ width: 20, height: 20, color: 'text.secondary' }} />
          </button>
        </div>

        {/* 内容区域 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: theme.palette.grey[50],
            position: 'relative',
          }}
        >
          {/* 加载和错误状态使用绝对定位 */}
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'common.white',
                zIndex: 10,
              }}
            >
              <Loader2
                sx={{
                  width: 40,
                  height: 40,
                  color: 'primary.dark',
                  animation: 'spin 1s linear infinite',
                  marginBottom: 1.5,
                }}
              />
              <p style={{ color: theme.palette.text.secondary }}>正在加载文档...</p>
            </div>
          )}

          {error && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'common.white',
                zIndex: 10,
              }}
            >
              <AlertCircle
                sx={{
                  width: 40,
                  height: 40,
                  color: 'error.main',
                  marginBottom: 1.5,
                }}
              />
              <p style={{ color: theme.palette.error.dark, marginBottom: 4 }}>{error}</p>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.palette.grey[200],
                  color: theme.palette.grey[700],
                  borderRadius: 'md',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                关闭
              </button>
            </div>
          )}

          {/* 容器始终渲染和显示 */}
          <div
            ref={containerRef}
            style={{ padding: 4, minHeight: '80vh' }}
          />
        </div>

        {/* 底部操作栏 */}
        <div
          style={{
            padding: 4,
            borderTop: '1px solid grey.200',
            backgroundColor: theme.palette.grey[50],
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: theme.palette.grey[200],
              color: theme.palette.grey[700],
              borderRadius: 'md',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
