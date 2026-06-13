import React, { useEffect, useRef, useState } from "react";
import { X, FileText, AlertCircle, Loader2 } from "lucide-react";
import { renderAsync } from "docx-preview";
import { docApi } from "../api/doc";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadAndPreview = async () => {
      console.log("开始预览:", { fileName, contentType, fileId });

      if (!containerRef.current) {
        console.error("容器引用为 null");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const container = containerRef.current;
        container.innerHTML = "";
        console.log("容器已清空");

        if (contentType.includes("image/")) {
          console.log("预览图片");
          const imgUrl = await docApi.preview(fileId);
          const img = document.createElement("img");
          img.src = imgUrl;
          img.className = "max-w-full max-h-[80vh] mx-auto";
          img.alt = fileName;
          container.appendChild(img);
        } else if (contentType.includes("application/pdf")) {
          console.log("预览 PDF");
          const blob = await docApi.download(fileId);
          console.log("获取到 PDF Blob，大小:", blob.size);
          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;
          const iframe = document.createElement("iframe");
          iframe.src = blobUrl;
          iframe.className = "w-full h-[80vh] border-0";
          iframe.onload = () => {
            console.log("PDF iframe loaded");
          };
          iframe.onerror = (e) => {
            console.error("PDF iframe error:", e);
            if (blobUrlRef.current) {
              URL.revokeObjectURL(blobUrlRef.current);
              blobUrlRef.current = null;
            }
          };
          container.appendChild(iframe);
        } else if (fileName.endsWith(".docx")) {
          console.log("预览 DOCX");
          const blob = await docApi.download(fileId);
          console.log("获取到 Blob，大小:", blob.size, "类型:", blob.type);

          // 检查 blob 内容
          const text = await blob.text();
          console.log("Blob 内容前 100 字符:", text.substring(0, 100));

          // 如果内容不是以 PK (ZIP 头) 开头，说明返回了错误
          const bytes = await blob.arrayBuffer();
          const view = new DataView(bytes);
          const header = String.fromCharCode(view.getUint8(0)) + String.fromCharCode(view.getUint8(1));
          console.log("文件头:", header, "(应该是 'PK')");

          if (header !== "PK") {
            throw new Error(`文件格式错误：期望 DOCX (ZIP)，实际得到 ${blob.type || 'unknown'}`);
          }

          // 再次检查容器是否还存在
          if (containerRef.current) {
            console.log("开始调用 docx-preview renderAsync");
            await renderAsync(blob, containerRef.current);
            console.log("DOCX 渲染完成");
          }
        } else if (
          contentType.includes("text/") ||
          fileName.endsWith(".md") ||
          fileName.endsWith(".txt")
        ) {
          console.log("预览文本/Markdown");
          const blob = await docApi.download(fileId);
          const text = await blob.text();
          console.log("获取到文本内容，长度:", text.length);
          const pre = document.createElement("pre");
          pre.textContent = text;
          pre.className =
            "whitespace-pre-wrap p-4 bg-gray-50 rounded overflow-auto max-h-[80vh] font-mono text-sm";
          container.appendChild(pre);
        } else {
          console.log("不支持的文件类型");
          setError(`不支持直接预览 ${fileName}，请下载后查看`);
        }
      } catch (err) {
        console.error("Preview error:", err);
        setError(
          `预览失败: ${err instanceof Error ? err.message : "未知错误"}`,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {fileName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto bg-gray-50 relative">
          {/* 加载和错误状态使用绝对定位 */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
              <p className="text-gray-600">正在加载文档...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          )}

          {/* 容器始终渲染和显示 */}
          <div ref={containerRef} className="p-4 min-h-[80vh]" />
        </div>

        {/* 底部操作栏 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
