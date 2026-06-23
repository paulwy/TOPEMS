import React, { useState, useEffect, useCallback } from "react";
import { logger } from "@/utils/logger";
import {
  Upload,
  FileText,
  Search,
  Filter,
  Trash2,
  Eye,
  Edit,
  Download,
  FolderOpen,
  Tag,
  Calendar,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  BookOpen,
  FileSearch,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import type { Document } from "@/api/ai";
import { aiApi } from "@/api/ai";

import { TextField, Card, CardContent, CardHeader, Chip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Menu, MenuItem, Tabs, Tab, FormControl, InputLabel, Select, Box, Typography, Stack, IconButton, Divider,  } from "@mui/material";
import { Button } from "@/components/ui/Button";

interface DocumentWithMeta extends Document {
  category?: string;
  tags?: string[];
  description?: string;
}

const KnowledgeBasePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [documents, setDocuments] = useState<DocumentWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentWithMeta | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
  });

  const categories = [
    { value: "all", label: "全部" },
    { value: "技术文档", label: "技术文档" },
    { value: "业务流程", label: "业务流程" },
    { value: "产品说明", label: "产品说明" },
    { value: "培训资料", label: "培训资料" },
    { value: "规章制度", label: "规章制度" },
    { value: "其他", label: "其他" },
  ];

  // 加载文档列表
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await aiApi.listDocuments();
      if (response.success && response.data) {
        const docs =
          "items" in response.data ? response.data.items : response.data;
        setDocuments(docs);
      }
    } catch (err) {
      logger.error("加载文档列表失败:", err);
      addNotification({
        title: "加载失败",
        message: "加载文档列表失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 搜索和过滤文档
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // 处理文件拖拽
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        ["txt", "md", "json", "pdf", "doc", "docx"].some((ext) =>
          file.name.toLowerCase().endsWith(ext),
        ),
      );
      setUploadFiles(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadFiles(files);
    }
  };

  // 上传文档
  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      addNotification({
        title: "提示",
        message: "请选择要上传的文件",
        type: "warning",
      });
      return;
    }

    setUploading(true);
    try {
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append("file", file);

        // 使用 fetch 直接上传，因为 aiApi 可能不支持 FormData
        const response = await fetch("/ai/api/ai/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`上传失败: ${file.name}`);
        }
      }

      addNotification({
        title: "上传成功",
        message: `成功上传 ${uploadFiles.length} 个文档`,
        type: "success",
      });
      setShowUploadDialog(false);
      setUploadFiles([]);
      loadDocuments();
    } catch (err) {
      logger.error("上传失败:", err);
      addNotification({
        title: "上传失败",
        message: "文档上传失败",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  // 删除文档
  const handleDelete = async (docId: string) => {
    if (!confirm("确定要删除这个文档吗？此操作不可恢复。")) {
      return;
    }

    try {
      const response = await aiApi.deleteDocument(docId);
      if (response.success) {
        addNotification({
          title: "删除成功",
          message: "文档已删除",
          type: "success",
        });
        loadDocuments();
      }
    } catch (err) {
      logger.error("删除失败:", err);
      addNotification({
        title: "删除失败",
        message: "删除文档失败",
        type: "error",
      });
    }
  };

  // 查看文档详情
  const handleViewDetail = (doc: DocumentWithMeta) => {
    setSelectedDocument(doc);
    setShowDetailDialog(true);
  };

  // 编辑文档
  const handleEdit = (doc: DocumentWithMeta) => {
    setSelectedDocument(doc);
    setEditForm({
      title: doc.title,
      description: doc.description || "",
      category: doc.category || "",
      tags: doc.tags?.join(", ") || "",
    });
    setShowEditDialog(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedDocument) return;

    try {
      const updatedDoc = {
        ...selectedDocument,
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        tags: editForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t),
      };

      const response = await aiApi.updateDocument(
        selectedDocument.id,
        updatedDoc,
      );
      if (response.success) {
        addNotification({
          title: "保存成功",
          message: "文档信息已更新",
          type: "success",
        });
        setShowEditDialog(false);
        loadDocuments();
      }
    } catch (err) {
      logger.error("保存失败:", err);
      addNotification({
        title: "保存失败",
        message: "更新文档信息失败",
        type: "error",
      });
    }
  };

  // 重新加载文档
  const handleReload = async () => {
    setLoading(true);
    try {
      const response = await aiApi.listDocuments();
      if (response.success) {
        addNotification({
          title: "重新加载成功",
          message: "文档列表已刷新",
          type: "success",
        });
        loadDocuments();
      }
    } catch (err) {
      addNotification({
        title: "重新加载失败",
        message: "刷新文档列表失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "未知";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(parseInt(dateStr) * 1000);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        {/* 页面头部 */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  background:
                    "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BookOpen size={28} color="white" />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  知识库管理
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  管理和组织企业的知识文档,为 AI 提供上下文支持
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={handleReload}
                disabled={loading}
              >
                <Box
                  sx={{
                    display: "inline-flex",
                    mr: 1,
                    animation: loading ? "spin 1s linear infinite" : "none",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                >
                  <RefreshCw size={16} />
                </Box>
                重新加载
              </Button>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload size={16} style={{ marginRight: 8 }} />
                上传文档
              </Button>
            </Box>
          </Box>
        </Box>

        {/* 搜索和过滤 */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ flex: 1, position: "relative" }}>
                <TextField
                  type="text"
                  placeholder="搜索文档标题或文件名..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Search
                          size={16}
                          color="#9ca3af"
                          style={{ marginRight: 8 }}
                        />
                      ),
                    },
                  }}
                />
              </Box>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>分类</InputLabel>
                <Select
                  value={selectedCategory}
                  label="分类"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  startAdornment={
                    <Filter size={16} style={{ marginRight: 8 }} />
                  }
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* 文档统计 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <FileText size={32} color="#a855f7" />
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    总文档数
                  </Typography>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 700 }}>
                    {documents.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <FolderOpen size={32} color="#3b82f6" />
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    分类数量
                  </Typography>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 700 }}>
                    {new Set(documents.map((d) => d.category || "未分类")).size}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <CheckCircle size={32} color="#22c55e" />
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    已处理
                  </Typography>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 700 }}>
                    {documents.filter((d) => d.status === "processed").length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 文档列表 */}
        <Card>
          <CardHeader
            title={
              <Typography
                variant="h6"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>文档列表 ({filteredDocuments.length})</span>
              </Typography>
            }
          />
          <CardContent>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                }}
              >
                <Box
                  sx={{
                    display: "inline-flex",
                    animation: "spin 1s linear infinite",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                >
                  <Loader2 size={32} color="#a855f7" />
                </Box>
              </Box>
            ) : filteredDocuments.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <FileSearch
                  size={64}
                  color="#9ca3af"
                  style={{ margin: "0 auto 16px" }}
                />
                <Typography sx={{ color: "grey.500", mb: 1 }}>
                  暂无文档
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.400" }}>
                  点击"上传文档"按钮添加知识库文档
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {filteredDocuments.map((doc) => (
                  <Box
                    key={doc.id}
                    sx={{
                      p: 2,
                      bgcolor: "grey.50",
                      borderRadius: 2,
                      transition: "background-color 0.2s",
                      "&:hover": { bgcolor: "grey.100" },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1.5,
                          flex: 1,
                        }}
                      >
                        <FileText
                          size={24}
                          color="#a855f7"
                          style={{ marginTop: 4 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 0.5,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {doc.title}
                            </Typography>
                            {doc.category && (
                              <Chip
                                label={doc.category}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {doc.status === "processed" && (
                              <Chip
                                label="已处理"
                                size="small"
                                color="success"
                              />
                            )}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ color: "grey.500", mb: 1 }}
                          >
                            文件名: {doc.filename}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              fontSize: "0.75rem",
                              color: "grey.400",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Calendar size={12} style={{ marginRight: 4 }} />
                              {formatDate(doc.created_at)}
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <File size={12} style={{ marginRight: 4 }} />
                              {formatFileSize(doc.file_size)}
                            </Box>
                            {doc.mime_type && (
                              <Chip label={doc.mime_type} size="small" />
                            )}
                          </Box>
                          {doc.tags && doc.tags.length > 0 && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mt: 1,
                              }}
                            >
                              <Tag size={12} color="#9ca3af" />
                              {doc.tags.map((tag, idx) => (
                                <Chip
                                  key={idx}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => handleViewDetail(doc)}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => handleDelete(doc.id)}
                          sx={{
                            color: "error.main",
                            "&:hover": { bgcolor: "error.light" },
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 上传对话框 */}
        <Dialog
          open={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
        >
          <DialogTitle>上传文档</DialogTitle>
          <DialogContentText sx={{ px: 3, pt: 1 }}>
            上传文档到知识库,支持 txt、md、json、pdf、doc、docx 格式
          </DialogContentText>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* 拖拽上传区域 */}
              <Box
                sx={{
                  border: 2,
                  borderStyle: "dashed",
                  borderRadius: 2,
                  p: 4,
                  textAlign: "center",
                  transition: "background-color 0.2s, border-color 0.2s",
                  borderColor: dragActive ? "primary.main" : "grey.300",
                  bgcolor: dragActive ? "primary.light" : "transparent",
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload
                  size={48}
                  color="#9ca3af"
                  style={{ margin: "0 auto 16px" }}
                />
                <Typography sx={{ color: "grey.600", mb: 1 }}>
                  拖拽文件到这里,或点击选择文件
                </Typography>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                  id="file-upload"
                  accept=".txt,.md,.json,.pdf,.doc,.docx"
                />
                <Button
                  variant="outlined"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                >
                  <Plus size={16} style={{ marginRight: 8 }} />
                  选择文件
                </Button>
              </Box>

              {/* 已选择的文件列表 */}
              {uploadFiles.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2">已选择的文件</Typography>
                  {uploadFiles.map((file, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1,
                        bgcolor: "grey.100",
                        borderRadius: 1,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FileText size={16} color="#a855f7" />
                        <Typography variant="body2">{file.name}</Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "grey.500" }}
                        >
                          {formatFileSize(file.size)}
                        </Typography>
                      </Box>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() =>
                          setUploadFiles(
                            uploadFiles.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <X size={16} />
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={() => setShowUploadDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || uploadFiles.length === 0}
            >
              {uploading ? (
                <Box
                  sx={{
                    display: "inline-flex",
                    mr: 1,
                    animation: "spin 1s linear infinite",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                >
                  <Loader2 size={16} />
                </Box>
              ) : (
                <Upload size={16} style={{ marginRight: 8 }} />
              )}
              {uploading ? "上传中..." : "开始上传"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 文档详情对话框 */}
        <Dialog
          open={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>文档详情</DialogTitle>
          <DialogContent>
            {selectedDocument && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      文档标题
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedDocument.title}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      文件名
                    </Typography>
                    <Typography variant="body1">
                      {selectedDocument.filename}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      文件大小
                    </Typography>
                    <Typography variant="body1">
                      {formatFileSize(selectedDocument.file_size)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      文件类型
                    </Typography>
                    <Typography variant="body1">
                      {selectedDocument.mime_type || "未知"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      创建时间
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedDocument.created_at)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      更新时间
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedDocument.updated_at)}
                    </Typography>
                  </Box>
                </Box>
                {selectedDocument.category && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      分类
                    </Typography>
                    <Chip
                      label={selectedDocument.category}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                )}
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      标签
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      {selectedDocument.tags.map((tag, idx) => (
                        <Chip
                          key={idx}
                          label={tag}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
                {selectedDocument.description && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      描述
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {selectedDocument.description}
                    </Typography>
                  </Box>
                )}
                {selectedDocument.file_path && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      文件路径
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {selectedDocument.file_path}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={() => setShowDetailDialog(false)}
            >
              关闭
            </Button>
            <Button
              onClick={() => {
                setShowDetailDialog(false);
                handleEdit(selectedDocument!);
              }}
            >
              <Edit size={16} style={{ marginRight: 8 }} />
              编辑
            </Button>
          </DialogActions>
        </Dialog>

        {/* 编辑文档对话框 */}
        <Dialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>编辑文档信息</DialogTitle>
          <DialogContentText sx={{ px: 3, pt: 1 }}>
            更新文档的标题、描述、分类和标签信息
          </DialogContentText>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  文档标题
                </Typography>
                <TextField
                  id="title"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  size="small"
                  fullWidth
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  分类
                </Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    displayEmpty
                  >
                    <MenuItem value="" disabled>
                      选择分类
                    </MenuItem>
                    {categories
                      .filter((c) => c.value !== "all")
                      .map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  标签(用逗号分隔)
                </Typography>
                <TextField
                  id="tags"
                  value={editForm.tags}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tags: e.target.value })
                  }
                  placeholder="例如: 技术, API, 开发"
                  size="small"
                  fullWidth
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  描述
                </Typography>
                <TextField
                  id="description"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  multiline
                  rows={4}
                  placeholder="添加文档描述..."
                  size="small"
                  fullWidth
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button variant="contained" onClick={handleSaveEdit}>
              <CheckCircle size={16} style={{ marginRight: 8 }} />
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default KnowledgeBasePage;
