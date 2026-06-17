import { Grid } from "@/components/Grid";
import React, { useState, useEffect } from "react";
import {
  File,
  Folder,
  Upload,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  Share2,
  Star,
  Clock,
  List,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/NotificationContainer";
import { Box, Typography } from "@mui/material";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  category: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  path: string;
}

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  type: "folder";
  document_count: number;
  created_at: string;
}

const DocumentCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      setTimeout(() => {
        setFolders([
          {
            id: "1",
            name: "项目文档",
            parent_id: null,
            type: "folder",
            document_count: 15,
            created_at: "2024-01-01",
          },
          {
            id: "2",
            name: "技术文档",
            parent_id: null,
            type: "folder",
            document_count: 23,
            created_at: "2024-01-15",
          },
          {
            id: "3",
            name: "规章制度",
            parent_id: null,
            type: "folder",
            document_count: 8,
            created_at: "2024-02-01",
          },
        ]);

        setDocuments([
          {
            id: "1",
            name: "项目需求文档.docx",
            type: "docx",
            size: 1024 * 512,
            category: "项目文档",
            tags: ["需求", "PRD"],
            is_favorite: true,
            created_at: "2024-03-01",
            updated_at: "2024-03-15",
            created_by: "张三",
            path: "/项目文档",
          },
          {
            id: "2",
            name: "系统架构设计.pdf",
            type: "pdf",
            size: 1024 * 1024 * 2.5,
            category: "技术文档",
            tags: ["架构", "设计"],
            is_favorite: false,
            created_at: "2024-02-20",
            updated_at: "2024-03-10",
            created_by: "李四",
            path: "/技术文档",
          },
          {
            id: "3",
            name: "员工手册.pdf",
            type: "pdf",
            size: 1024 * 1024 * 1.2,
            category: "规章制度",
            tags: ["手册", "制度"],
            is_favorite: false,
            created_at: "2024-01-10",
            updated_at: "2024-01-10",
            created_by: "管理员",
            path: "/规章制度",
          },
          {
            id: "4",
            name: "数据统计报表.xlsx",
            type: "xlsx",
            size: 1024 * 256,
            category: "项目文档",
            tags: ["统计", "报表"],
            is_favorite: true,
            created_at: "2024-03-05",
            updated_at: "2024-03-18",
            created_by: "王五",
            path: "/项目文档",
          },
        ]);

        setLoading(false);
      }, 500);
    } catch (err: any) {
      error(err.message || "加载数据失败");
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText sx={{ width: 32, height: 32, color: "error.main" }} />;
      case "docx":
      case "doc":
        return (
          <FileText sx={{ width: 32, height: 32, color: "primary.main" }} />
        );
      case "xlsx":
      case "xls":
        return (
          <FileText sx={{ width: 32, height: 32, color: "success.main" }} />
        );
      default:
        return <File sx={{ width: 32, height: 32, color: "grey.500" }} />;
    }
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleUpload = () => {
    setShowUploadModal(true);
  };

  const handlePreview = (doc: Document) => {
    setSelectedDocument(doc);
    setShowPreviewModal(true);
  };

  const handleDownload = (doc: Document) => {
    success(`正在下载: ${doc.name}`);
  };

  const handleToggleFavorite = (docId: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, is_favorite: !doc.is_favorite } : doc,
      ),
    );
    success("收藏状态已更新");
  };

  const handleDelete = (docId: string) => {
    if (!confirm("确定要删除这个文件吗？")) return;
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    success("文件已删除");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box
                onClick={() => navigate("/dashboard")}
                sx={{
                  p: 1,
                  "&:hover": { bgcolor: "grey.200" },
                  borderRadius: 1,
                  cursor: "pointer",
                }}
              >
                <ChevronLeft
                  sx={{ width: 20, height: 20, color: "grey.600" }}
                />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "grey.900",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <File sx={{ width: 28, height: 28, color: "primary.main" }} />
                  文档中心
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: "grey.500" }}>
                  统一管理企业文档，支持分类、标签和全文搜索
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                onClick={handleUpload}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  bgcolor: "primary.main",
                  color: "white",
                  borderRadius: 2,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                <Upload sx={{ width: 20, height: 20, mr: 1 }} />
                上传文件
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Breadcrumb */}
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            fontSize: "0.875rem",
          }}
        >
          <Box
            onClick={() => setCurrentPath([])}
            sx={{
              color: "primary.main",
              cursor: "pointer",
              "&:hover": { color: "primary.dark" },
            }}
          >
            全部文档
          </Box>
          {currentPath.map((path, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight sx={{ width: 16, height: 16, color: "grey.400" }} />
              <Box
                onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                sx={
                  idx === currentPath.length - 1
                    ? { color: "grey.900" }
                    : {
                        color: "primary.main",
                        cursor: "pointer",
                        "&:hover": { color: "primary.dark" },
                      }
                }
              >
                {path}
              </Box>
            </React.Fragment>
          ))}
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 3 }}>
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            p: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ flex: 1, position: "relative" }}>
              <Search
                sx={{
                  position: "absolute",
                  left: 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 20,
                  height: 20,
                  color: "grey.400",
                }}
              />
              <input
                type="text"
                placeholder="搜索文件名、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: 40,
                  paddingRight: 16,
                  paddingTop: 8,
                  paddingBottom: 8,
                  border: "1px solid",
                  borderColor: "grey.300",
                  borderRadius: 8,
                  outline: "none",
                }}
              />
            </Box>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: "8px 16px",
                border: "1px solid",
                borderColor: "grey.300",
                borderRadius: 8,
                outline: "none",
              }}
            >
              <option value="">全部分类</option>
              <option value="项目文档">项目文档</option>
              <option value="技术文档">技术文档</option>
              <option value="规章制度">规章制度</option>
            </select>

            <Box
              sx={{
                border: 1,
                borderColor: "grey.300",
                borderRadius: 1,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <Box
                onClick={() => setViewMode("grid")}
                sx={{
                  p: 1,
                  bgcolor:
                    viewMode === "grid" ? "primary.main" : "background.paper",
                  color: viewMode === "grid" ? "white" : "grey.600",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: viewMode === "grid" ? "primary.main" : "grey.100",
                  },
                }}
              >
                <Grid sx={{ width: 20, height: 20 }} />
              </Box>
              <Box
                onClick={() => setViewMode("list")}
                sx={{
                  p: 1,
                  bgcolor:
                    viewMode === "list" ? "primary.main" : "background.paper",
                  color: viewMode === "list" ? "white" : "grey.600",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: viewMode === "list" ? "primary.main" : "grey.100",
                  },
                }}
              >
                <List sx={{ width: 20, height: 20 }} />
              </Box>
            </Box>

            <Box
              onClick={loadData}
              sx={{
                px: 2,
                py: 1,
                color: "grey.700",
                bgcolor: "grey.200",
                borderRadius: 2,
                cursor: "pointer",
                "&:hover": { bgcolor: "grey.300" },
              }}
            >
              刷新
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, pb: 4 }}>
        {/* Folders */}
        {currentPath.length === 0 && folders.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.900", mb: 2 }}
            >
              文件夹
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 1, sm: 2, md: 4, lg: 6 },
                gap: 2,
              }}
            >
              {folders.map((folder) => (
                <Box
                  key={folder.id}
                  onClick={() => setCurrentPath([...currentPath, folder.name])}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    p: 2,
                    border: 1,
                    borderColor: "grey.200",
                    cursor: "pointer",
                    "&:hover": { boxShadow: 3, borderColor: "primary.light" },
                    transition: "all 0.2s",
                  }}
                >
                  <Folder
                    sx={{
                      width: 40,
                      height: 40,
                      color: "warning.main",
                      mb: 1.5,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: "grey.900",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {folder.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "grey.500" }}>
                    {folder.document_count} 个文件
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Documents */}
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <Loader2
                sx={{
                  width: 48,
                  height: 48,
                  color: "primary.main",
                  mx: "auto",
                  animation: "spin 1s linear infinite",
                }}
              />
              <Typography variant="body2" sx={{ mt: 1, color: "grey.500" }}>
                加载中...
              </Typography>
            </Box>
          ) : filteredDocuments.length === 0 ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <File
                sx={{
                  width: 48,
                  height: 48,
                  color: "grey.400",
                  mx: "auto",
                  mb: 1.5,
                }}
              />
              <Typography sx={{ color: "grey.500" }}>暂无文档</Typography>
            </Box>
          ) : viewMode === "grid" ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 1, sm: 2, md: 4, lg: 6 },
                gap: 2,
                p: 3,
              }}
            >
              {filteredDocuments.map((doc) => (
                <Box
                  key={doc.id}
                  sx={{
                    bgcolor: "grey.50",
                    borderRadius: 2,
                    p: 2,
                    border: 1,
                    borderColor: "grey.200",
                    "&:hover": { boxShadow: 2 },
                    transition: "box-shadow 0.2s",
                    "&:hover .hidden-actions": { opacity: 1 },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: 1,
                      }}
                    >
                      {getFileIcon(doc.type)}
                    </Box>
                    <Box
                      onClick={() => handleToggleFavorite(doc.id)}
                      sx={{
                        p: 0.5,
                        borderRadius: 1,
                        cursor: "pointer",
                        color: doc.is_favorite ? "warning.main" : "grey.400",
                        "&:hover": { color: "warning.main" },
                      }}
                    >
                      <Star
                        sx={{ width: 16, height: 16 }}
                        style={{
                          fill: doc.is_favorite ? "currentColor" : "none",
                        }}
                      />
                    </Box>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: "grey.900",
                      mb: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={doc.name}
                  >
                    {doc.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "grey.500", mb: 1 }}
                  >
                    {formatFileSize(doc.size)}
                  </Typography>

                  <Box
                    className="hidden-actions"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      opacity: 0,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Box
                        onClick={() => handlePreview(doc)}
                        sx={{
                          p: 0.5,
                          color: "grey.500",
                          "&:hover": {
                            color: "primary.main",
                            bgcolor: "primary.50",
                          },
                          borderRadius: 1,
                          cursor: "pointer",
                        }}
                        title="预览"
                      >
                        <Eye sx={{ width: 16, height: 16 }} />
                      </Box>
                      <Box
                        onClick={() => handleDownload(doc)}
                        sx={{
                          p: 0.5,
                          color: "grey.500",
                          "&:hover": {
                            color: "success.main",
                            bgcolor: "success.50",
                          },
                          borderRadius: 1,
                          cursor: "pointer",
                        }}
                        title="下载"
                      >
                        <Download sx={{ width: 16, height: 16 }} />
                      </Box>
                      <Box
                        onClick={() => handleDelete(doc.id)}
                        sx={{
                          p: 0.5,
                          color: "grey.500",
                          "&:hover": {
                            color: "error.main",
                            bgcolor: "error.50",
                          },
                          borderRadius: 1,
                          cursor: "pointer",
                        }}
                        title="删除"
                      >
                        <Trash2 sx={{ width: 16, height: 16 }} />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                "& > *": { borderTop: 1, borderColor: "divider" },
                "& > *:first-of-type": { borderTop: 0 },
              }}
            >
              {filteredDocuments.map((doc) => (
                <Box
                  key={doc.id}
                  sx={{
                    p: 2,
                    "&:hover": { bgcolor: "grey.50" },
                    transition: "background-color 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      flex: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: "grey.100",
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {getFileIcon(doc.type)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: "grey.900",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doc.name}
                        </Typography>
                        {doc.is_favorite && (
                          <Star
                            sx={{
                              width: 16,
                              height: 16,
                              color: "warning.main",
                            }}
                            style={{ fill: "currentColor" }}
                          />
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          fontSize: "0.875rem",
                          color: "grey.500",
                        }}
                      >
                        <span>{formatFileSize(doc.size)}</span>
                        <span>·</span>
                        <span>{doc.category}</span>
                        <span>·</span>
                        <span>{doc.updated_at}</span>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      onClick={() => handleToggleFavorite(doc.id)}
                      sx={{
                        p: 1,
                        color: "grey.400",
                        "&:hover": {
                          color: "warning.main",
                          bgcolor: "warning.50",
                        },
                        borderRadius: 2,
                        cursor: "pointer",
                      }}
                    >
                      <Star
                        sx={{ width: 16, height: 16 }}
                        style={{
                          fill: doc.is_favorite ? "currentColor" : "none",
                        }}
                      />
                    </Box>
                    <Box
                      onClick={() => handlePreview(doc)}
                      sx={{
                        p: 1,
                        color: "grey.400",
                        "&:hover": {
                          color: "primary.main",
                          bgcolor: "primary.50",
                        },
                        borderRadius: 2,
                        cursor: "pointer",
                      }}
                    >
                      <Eye sx={{ width: 16, height: 16 }} />
                    </Box>
                    <Box
                      onClick={() => handleDownload(doc)}
                      sx={{
                        p: 1,
                        color: "grey.400",
                        "&:hover": {
                          color: "success.main",
                          bgcolor: "success.50",
                        },
                        borderRadius: 2,
                        cursor: "pointer",
                      }}
                    >
                      <Download sx={{ width: 16, height: 16 }} />
                    </Box>
                    <Box
                      onClick={() => handleDelete(doc.id)}
                      sx={{
                        p: 1,
                        color: "grey.400",
                        "&:hover": { color: "error.main", bgcolor: "error.50" },
                        borderRadius: 2,
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 sx={{ width: 16, height: 16 }} />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            success("文件上传成功");
            setShowUploadModal(false);
            loadData();
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedDocument && (
        <PreviewModal
          document={selectedDocument}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedDocument(null);
          }}
          onDownload={() => handleDownload(selectedDocument)}
        />
      )}
    </Box>
  );
};

// Upload Modal Component
interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        p: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 6,
          width: "100%",
          maxWidth: 600,
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900" }}>
            上传文件
          </Typography>
          <Box
            onClick={onClose}
            sx={{
              p: 1,
              "&:hover": { bgcolor: "grey.100" },
              borderRadius: 1,
              cursor: "pointer",
            }}
          >
            <X sx={{ width: 20, height: 20 }} />
          </Box>
        </Box>

        <Box sx={{ p: 3 }}>
          <Box
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              border: 2,
              borderStyle: "dashed",
              borderRadius: 2,
              p: 6,
              textAlign: "center",
              borderColor: dragActive ? "primary.main" : "grey.300",
              bgcolor: dragActive ? "primary.50" : "transparent",
              "&:hover": { borderColor: "primary.light" },
              transition: "all 0.2s",
            }}
          >
            <Upload
              sx={{
                width: 48,
                height: 48,
                color: "grey.400",
                mx: "auto",
                mb: 2,
              }}
            />
            <Typography sx={{ color: "grey.600", mb: 1 }}>
              拖拽文件到此处，或{" "}
              <Box
                component="span"
                sx={{ color: "primary.main", cursor: "pointer" }}
              >
                点击选择
              </Box>
            </Typography>
            <Typography variant="caption" sx={{ color: "grey.500" }}>
              支持 .pdf, .docx, .xlsx, .txt 等格式，单个文件不超过 100MB
            </Typography>
          </Box>

          {files.length > 0 && (
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}
            >
              {files.map((file, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    bgcolor: "grey.50",
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <File sx={{ width: 20, height: 20, color: "grey.500" }} />
                    <Typography variant="body2" sx={{ color: "grey.700" }}>
                      {file.name}
                    </Typography>
                  </Box>
                  <Box
                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                    sx={{
                      p: 0.5,
                      color: "grey.400",
                      "&:hover": { color: "error.main" },
                      cursor: "pointer",
                    }}
                  >
                    <X sx={{ width: 16, height: 16 }} />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
          }}
        >
          <Box
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              color: "grey.700",
              bgcolor: "grey.100",
              borderRadius: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: "grey.200" },
            }}
          >
            取消
          </Box>
          <Box
            onClick={onSuccess}
            sx={{
              px: 2,
              py: 1,
              bgcolor: files.length === 0 ? "grey.400" : "primary.main",
              color: "white",
              borderRadius: 2,
              cursor: files.length === 0 ? "not-allowed" : "pointer",
              "&:hover": {
                bgcolor: files.length === 0 ? "grey.400" : "primary.dark",
              },
            }}
          >
            开始上传
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// Preview Modal Component
interface PreviewModalProps {
  document: Document;
  onClose: () => void;
  onDownload: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  document,
  onClose,
  onDownload,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        p: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 6,
          width: "100%",
          maxWidth: 900,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.900" }}
            >
              {document.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
              {formatFileSize(document.size)} · {document.category} ·{" "}
              {document.created_by}
            </Typography>
          </Box>
          <Box
            onClick={onClose}
            sx={{
              p: 1,
              "&:hover": { bgcolor: "grey.100" },
              borderRadius: 1,
              cursor: "pointer",
            }}
          >
            <X sx={{ width: 20, height: 20 }} />
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto", p: 3, bgcolor: "grey.100" }}>
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              p: 6,
              textAlign: "center",
            }}
          >
            <File
              sx={{
                width: 96,
                height: 96,
                color: "grey.400",
                mx: "auto",
                mb: 2,
              }}
            />
            <Typography sx={{ color: "grey.500" }}>
              文件预览功能开发中...
            </Typography>
            <Typography variant="caption" sx={{ color: "grey.400", mt: 1 }}>
              支持 PDF、Word、Excel 等格式的在线预览
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
          }}
        >
          <Box
            onClick={onDownload}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: "primary.main",
              color: "white",
              borderRadius: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            <Download sx={{ width: 16, height: 16 }} />
            <span>下载</span>
          </Box>
          <Box
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              bgcolor: "grey.100",
              color: "grey.700",
              borderRadius: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: "grey.200" },
            }}
          >
            关闭
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DocumentCenterPage;
