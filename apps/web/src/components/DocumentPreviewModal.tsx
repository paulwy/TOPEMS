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
          img.style.maxWidth = "100%";
          img.style.maxHeight = "80vh";
          img.style.margin = "auto";
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
          iframe.style.width = "100%";
          iframe.style.height = "80vh";
          iframe.style.border = "0";
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
          const header =
            String.fromCharCode(view.getUint8(0)) +
            String.fromCharCode(view.getUint8(1));
          console.log("文件头:", header, "(应该是 'PK')");

          if (header !== "PK") {
            throw new Error(
              `文件格式错误：期望 DOCX (ZIP)，实际得到 ${blob.type || "unknown"}`,
            );
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
          pre.style.whiteSpace = "pre-wrap";
          pre.style.padding = "16px";
          pre.style.backgroundColor = "#f9fafb";
          pre.style.borderRadius = "8px";
          pre.style.overflow = "auto";
          pre.style.maxHeight = "80vh";
          pre.style.fontFamily = "monospace";
          pre.style.fontSize = "14px";
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
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", width: "100%", maxWidth: "1024px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* 头部 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FileText sx={{ width: 24, height: 24, color: "#2563eb" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fileName}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ padding: "8px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", transition: "background-color 0.2s" }}
          >
            <X sx={{ width: 20, height: 20, color: "#6b7280" }} />
          </button>
        </div>

        {/* 内容区域 */}
        <div style={{ flex: 1, overflow: "auto", backgroundColor: "#f9fafb", position: "relative" }}>
          {/* 加载和错误状态使用绝对定位 */}
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 255, 255, 0.8)", zIndex: 10 }}>
              <Loader2 sx={{ width: 40, height: 40, color: "#2563eb", animation: "spin 1s linear infinite", marginBottom: "12px" }} />
              <p style={{ color: "#6b7280" }}>正在加载文档...</p>
            </div>
          )}

          {error && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 255, 255, 0.8)", zIndex: 10 }}>
              <AlertCircle sx={{ width: 40, height: 40, color: "#ef4444", marginBottom: "12px" }} />
              <p style={{ color: "#dc2626", marginBottom: "16px" }}>{error}</p>
              <button
                onClick={onClose}
                style={{ padding: "8px 16px", backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "8px", border: "none", cursor: "pointer", transition: "background-color 0.2s" }}
              >
                关闭
              </button>
            </div>
          )}

          {/* 容器始终渲染和显示 */}
          <div ref={containerRef} style={{ padding: "16px", minHeight: "80vh" }} />
        </div>

        {/* 底部操作栏 */}
        <div style={{ padding: "16px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
          <button
            onClick={onClose}
            style={{ width: "100%", padding: "8px 16px", backgroundColor: "#e5e7eb", color: "#374151", borderRadius: "8px", border: "none", cursor: "pointer", transition: "background-color 0.2s" }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
