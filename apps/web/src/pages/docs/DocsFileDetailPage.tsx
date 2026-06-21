import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Container,
  Skeleton,
  Divider,
  Paper,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Edit2,
  Trash2,
  Download,
  Folder,
} from "lucide-react";
import { docApi, type FileMetadata } from "@/api/doc";
import { useAppStore } from "@/store";

const DocsFileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [file, setFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadFile(id);
    }
  }, [id]);

  const loadFile = async (fileId: string) => {
    setLoading(true);
    try {
      const res = await docApi.get(fileId);
      if (res.code === 200 && res.data) {
        setFile(res.data);
      }
    } catch (err) {
      addNotification({
        title: "错误",
        message: "加载文件信息失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("确定要删除此文件吗？")) return;

    try {
      const res = await docApi.delete(id);
      if (res.code === 200) {
        addNotification({
          title: "成功",
          message: "文件删除成功",
          type: "success",
        });
        navigate("/documents");
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除失败",
          type: "error",
        });
      }
    } catch (err) {
      addNotification({
        title: "错误",
        message: "删除文件失败",
        type: "error",
      });
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("zh-CN");
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileIcon = (contentType: string | undefined) => {
    if (!contentType) return <FileText style={{ width: 48, height: 48 }} />;
    if (contentType.startsWith("image/"))
      return <FileText style={{ width: 48, height: 48 }} />;
    if (contentType.startsWith("video/"))
      return <FileText style={{ width: 48, height: 48 }} />;
    if (contentType.includes("pdf"))
      return <FileText style={{ width: 48, height: 48 }} />;
    return <FileText style={{ width: 48, height: 48 }} />;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (!file) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">文件不存在或已被删除</Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate("/documents")}
          >
            返回文件列表
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="text"
              onClick={() => navigate("/documents")}
              startIcon={<ArrowLeft style={{ width: 20, height: 20 }} />}
            >
              返回
            </Button>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {file.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                文件详情信息
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download style={{ width: 18, height: 18 }} />}
              onClick={() => {
                addNotification({
                  title: "下载",
                  message: "文件下载功能开发中",
                  type: "info",
                });
              }}
            >
              下载
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit2 style={{ width: 18, height: 18 }} />}
              onClick={() => navigate(`/documents/${id}/edit`)}
            >
              编辑
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 style={{ width: 18, height: 18 }} />}
              onClick={handleDelete}
            >
              删除
            </Button>
          </Box>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            文件信息
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 3,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                }}
              >
                <Box sx={{ color: "primary.main" }}>
                  {getFileIcon(file.content_type)}
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {file.content_type || "未知类型"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            文件属性
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FileText style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    文件大小
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatFileSize(file.size)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Folder style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    所属文件夹
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {file.folder_id || "根目录"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    创建时间
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatDate(file.created_at)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    更新时间
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatDate(file.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <User style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    创建者
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {file.created_by || "-"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default DocsFileDetailPage;
