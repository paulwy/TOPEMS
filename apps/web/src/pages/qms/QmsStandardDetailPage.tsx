import React, { useState, useEffect } from "react";
import { apiLogger } from "@/utils/logger";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  FileCheck,
  AlertCircle,
  Edit3,
  Trash2,
  Plus,
  Download,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
} from "@mui/material";

import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { qmsApi } from "@/api/qms";
import type { QualityStandard, StandardRevision } from "@/api/qms";

const QmsStandardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [standard, setStandard] = useState<QualityStandard | null>(null);
  const [revisions, setRevisions] = useState<StandardRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    description: "",
    version: "",
    status: "active",
    category: "",
    effective_date: "",
  });

  useEffect(() => {
    if (id) {
      loadStandardDetail(id);
    }
  }, [id]);

  const loadStandardDetail = async (standardId: string) => {
    try {
      setLoading(true);
      const [standardRes, revisionsRes] = await Promise.all([
        qmsApi.getStandard(standardId),
        qmsApi.listRevisions(standardId),
      ]);

      if (standardRes.success && standardRes.data) {
        setStandard(standardRes.data as QualityStandard);
        const data = standardRes.data as QualityStandard;
        setFormData({
          title: data.title || "",
          code: data.code || "",
          description: data.description || "",
          version: data.version || "",
          status: data.status || "active",
          category: data.category || "",
          effective_date: data.effective_date
            ? new Date(data.effective_date).toISOString().split("T")[0]
            : "",
        });
      }

      if (revisionsRes.success && revisionsRes.data) {
        const revisionsData = revisionsRes.data as any;
        const revisionsArray = Array.isArray(revisionsData)
          ? revisionsData
          : revisionsData.revisions || [];
        setRevisions(revisionsArray);
      }
    } catch (error) {
      apiLogger.error("加载质量标准详情失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: { color: "bg-green-100 text-green-700", label: "有效" },
      有效: { color: "bg-green-100 text-green-700", label: "有效" },
      draft: { color: "bg-yellow-100 text-yellow-700", label: "草稿" },
      草稿: { color: "bg-yellow-100 text-yellow-700", label: "草稿" },
      expired: { color: "bg-red-100 text-red-700", label: "已过期" },
      已过期: { color: "bg-red-100 text-red-700", label: "已过期" },
      archived: { color: "bg-gray-100 text-gray-700", label: "已归档" },
      已归档: { color: "bg-gray-100 text-gray-700", label: "已归档" },
    };
    const item = statusMap[status] || {
      color: "bg-gray-100 text-gray-700",
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size="small"
        sx={{
          backgroundColor: item.color.includes("green")
            ? "#dcfce7"
            : item.color.includes("yellow")
              ? "#fef9c3"
              : item.color.includes("red")
                ? "#fee2e2"
                : "#f3f4f6",
          color: item.color.includes("green")
            ? "#15803d"
            : item.color.includes("yellow")
              ? "#a16207"
              : item.color.includes("red")
                ? "#b91c1c"
                : "#4b5563",
        }}
      />
    );
  };

  const handleUpdateStandard = async () => {
    if (!standard) return;
    try {
      const response = await qmsApi.updateStandard(standard.id, {
        name: formData.title,
        code: formData.code,
        description: formData.description,
        version: formData.version,
        status: formData.status,
        category: formData.category,
        content: standard.content || "",
        effective_date: formData.effective_date,
      });
      if (response.success) {
        setShowEditModal(false);
        loadStandardDetail(standard.id);
      }
    } catch (error) {
      apiLogger.error("更新质量标准失败:", error);
    }
  };

  const handleCreateRevision = async () => {
    if (!standard) return;
    try {
      const newVersion = formData.version || standard.version || "1.0";
      const [major, minor] = newVersion.split(".").map(Number);
      const nextVersion = `${major}.${minor + 1}`;

      // Create a new standard as a revision
      const response = await qmsApi.createStandard({
        name: standard.name,
        code: `${standard.code}-v${nextVersion}`,
        version: nextVersion,
        description: `升级至版本 ${nextVersion}`,
        category: standard.category,
        content: standard.content,
        status: "draft",
        effective_date: new Date().toISOString().split("T")[0],
      });
      if (response.success) {
        setShowRevisionModal(false);
        navigate("/qms/standards");
      }
    } catch (error) {
      apiLogger.error("创建版本失败:", error);
    }
  };

  const revisionColumns: ColumnDef<StandardRevision>[] = [
    {
      accessorKey: "version",
      header: "版本号",
      cell: ({ row }) => (
        <Chip
          label={`v${row.original.version}`}
          size="small"
          sx={{ backgroundColor: "#f3e8ff", color: "#7c3aed" }}
        />
      ),
    },
    { accessorKey: "description", header: "变更说明" },
    {
      accessorKey: "created_at",
      header: "创建时间",
      cell: ({ row }) => (
        <span>
          {row.original.created_at
            ? new Date(row.original.created_at).toLocaleString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "created_by",
      header: "创建人",
      cell: ({ row }) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <User sx={{ width: 16, height: 16 }} />
          <span>{row.original.created_by || "-"}</span>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid #bfdbfe",
              borderTop: "4px solid #2563eb",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px auto",
            }}
          ></div>
          <p style={{ color: "#475569" }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!standard) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <AlertCircle
            style={{
              width: 64,
              height: 64,
              color: "#ef4444",
              margin: "0 auto 16px auto",
            }}
          />
          <p style={{ color: "#475569" }}>质量标准不存在或已被删除</p>
          <Button onClick={() => navigate("/qms")} sx={{ mt: 2 }}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: 64,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/qms")}
                sx={{ minWidth: "auto", padding: "4px 8px" }}
              >
                <ArrowLeft sx={{ width: 16, height: 16 }} />
              </Button>
              <div>
                <h1
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  质量标准详情
                </h1>
                <p style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Quality Standard Detail
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                variant="outlined"
                onClick={() => setShowRevisionModal(true)}
                startIcon={<Plus sx={{ width: 16, height: 16 }} />}
              >
                新建版本
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowEditModal(true)}
                startIcon={<Edit3 sx={{ width: 16, height: 16 }} />}
              >
                编辑
              </Button>
            </div>
          </div>
        </Box>
      </Box>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 16px" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              gridColumn: { lg: "span 1" },
            }}
          >
            <Card>
              <CardHeader sx={{ pb: 1 }}>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "primary.main",
                  }}
                >
                  <FileText sx={{ width: 20, height: 20 }} />
                  标准信息
                </Typography>
              </CardHeader>
              <CardContent
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                      标准编号
                    </p>
                    <p
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 600,
                        color: "#0f172a",
                        marginTop: 4,
                      }}
                    >
                      {standard.code || standard.id}
                    </p>
                  </div>
                  {getStatusBadge(standard.status)}
                </div>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    标准名称
                  </p>
                  <p
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 500,
                      color: "#0f172a",
                      marginTop: 4,
                    }}
                  >
                    {standard.name}
                  </p>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                      版本
                    </p>
                    <p style={{ color: "#0f172a", marginTop: 4 }}>
                      <Chip
                        label={`v${standard.version}`}
                        size="small"
                        sx={{ backgroundColor: "#f3e8ff", color: "#7c3aed" }}
                      />
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                      分类
                    </p>
                    <p style={{ color: "#0f172a", marginTop: 4 }}>
                      {standard.category || "-"}
                    </p>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    生效日期
                  </p>
                  <p
                    style={{
                      color: "#0f172a",
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Calendar sx={{ width: 16, height: 16 }} />
                    {standard.effective_date
                      ? new Date(standard.effective_date).toLocaleDateString(
                          "zh-CN",
                        )
                      : "-"}
                  </p>
                </div>
                <div style={{ paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    标准描述
                  </p>
                  <p
                    style={{
                      color: "#0f172a",
                      marginTop: 4,
                      fontSize: "0.875rem",
                      lineHeight: 1.6,
                    }}
                  >
                    {standard.description || "暂无描述"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader sx={{ pb: 1 }}>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "success.main",
                  }}
                >
                  <FileCheck sx={{ width: 20, height: 20 }} />
                  操作
                </Typography>
              </CardHeader>
              <CardContent
                sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
              >
                <Button
                  fullWidth
                  sx={{ justifyContent: "flex-start" }}
                  variant="outlined"
                  startIcon={<Download sx={{ width: 16, height: 16 }} />}
                >
                  下载标准文档
                </Button>
                <Button
                  fullWidth
                  sx={{ justifyContent: "flex-start" }}
                  variant="outlined"
                  startIcon={<Upload sx={{ width: 16, height: 16 }} />}
                >
                  上传新版本文件
                </Button>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ gridColumn: { lg: "span 2" } }}>
            <Card>
              <CardHeader
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 1,
                }}
              >
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "primary.main",
                  }}
                >
                  <FileText sx={{ width: 20, height: 20 }} />
                  版本历史
                </Typography>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  共 {revisions.length} 个版本
                </span>
              </CardHeader>
              <CardContent>
                {revisions.length > 0 ? (
                  <DataTable
                    columns={revisionColumns}
                    data={revisions}
                    enablePagination={false}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "48px 0",
                      color: "#64748b",
                    }}
                  >
                    <FileText
                      style={{
                        width: 64,
                        height: 64,
                        margin: "0 auto 16px auto",
                        opacity: 0.5,
                      }}
                    />
                    <p>暂无版本记录</p>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => setShowRevisionModal(true)}
                      startIcon={<Plus sx={{ width: 12, height: 12 }} />}
                    >
                      创建第一个版本
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </main>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>编辑质量标准</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  标准编号 *
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="请输入标准编号"
                />
              </Box>
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  版本号
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.version}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      version: e.target.value,
                    }))
                  }
                  placeholder="如 1.0"
                />
              </Box>
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                标准名称 *
              </Box>
              <TextField
                size="small"
                fullWidth
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="请输入标准名称"
              />
            </Box>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  分类
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="请输入分类"
                />
              </Box>
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  状态
                </Box>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <option value="active">有效</option>
                  <option value="draft">草稿</option>
                  <option value="expired">已过期</option>
                  <option value="archived">已归档</option>
                </select>
              </Box>
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                生效日期
              </Box>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={formData.effective_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    effective_date: e.target.value,
                  }))
                }
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                描述
              </Box>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请输入标准描述..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  resize: "none",
                  height: "96px",
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowEditModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleUpdateStandard}>
            保存更改
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建版本</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Box component="span" sx={{ color: "text.secondary" }}>
                当前版本:
              </Box>
              <Box component="span" sx={{ fontWeight: 500 }}>
                {standard.version}
              </Box>
            </Box>
            <Box sx={{ color: "text.secondary", mt: 2 }}>
              创建新版本后，版本号将自动递增（如 1.0 → 1.1）
            </Box>
            <Box sx={{ mt: 2 }}>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                变更说明
              </Box>
              <textarea
                placeholder="请描述本次版本变更的内容..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  resize: "none",
                  height: "96px",
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setShowRevisionModal(false)}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateRevision}
            sx={{
              backgroundColor: "#7c3aed",
              "&:hover": { backgroundColor: "#6d28d9" },
            }}
          >
            创建版本
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default QmsStandardDetailPage;
