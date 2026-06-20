import React, { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { integrationApi } from "@/api/integration";
import type { LimsQmsSync, CreateLimsQmsSyncRequest } from "@/api/integration";
import { logger } from "@/utils/logger";

const IntegrationLimsQmsPage: React.FC = () => {
  const [syncs, setSyncs] = useState<LimsQmsSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await integrationApi.listLimsQmsSyncs();
      if (res.success && res.data !== undefined) setSyncs(res.data);
    } catch (error) {
      logger.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const data: CreateLimsQmsSyncRequest = {
        lims_sample_id: formData.get("lims_sample_id") as string,
        sample_name: formData.get("sample_name") as string,
        inspection_result:
          (formData.get("inspection_result") as string) || undefined,
        inspection_notes:
          (formData.get("inspection_notes") as string) || undefined,
      };
      await integrationApi.createLimsQmsSync(data);
      showToast("LIMS-QMS sync created successfully");
      e.currentTarget.reset();
      loadData();
    } catch (error) {
      logger.error("Error creating sync:", error);
      showToast("Failed to create sync");
    }
  };

  const handleSync = async (id: string) => {
    try {
      await integrationApi.syncLimsQms(id);
      showToast("LIMS-QMS sync completed");
      loadData();
    } catch (error) {
      logger.error("Error syncing:", error);
      showToast("Failed to sync");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "synced":
        return { backgroundColor: "#dcfce7", color: "#166534" };
      case "pending":
        return { backgroundColor: "#fef9c3", color: "#854d0e" };
      case "failed":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#1f2937" };
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
        }}
      >
        <Typography sx={{ color: "#4b5563" }}>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f9fafb", p: 3 }}>
      {toastMessage && (
        <Box
          sx={{
            position: "fixed",
            top: 2,
            right: 2,
            backgroundColor: "#2563eb",
            color: "#ffffff",
            px: 2,
            py: 1,
            borderRadius: 2,
            boxShadow: 3,
            zIndex: 50,
          }}
        >
          {toastMessage}
        </Box>
      )}

      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827" }}>
            🔬 LIMS ↔ QMS 同步
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: "#ffffff",
            p: 3,
            borderRadius: 2,
            boxShadow: 1,
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: "#111827", mb: 2 }}
          >
            ➕ 创建 LIMS ↔ QMS 同步
          </Typography>
          <Box
            component="form"
            onSubmit={handleCreate}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  mb: 0.5,
                }}
              >
                LIMS 样本 ID
              </Typography>
              <input
                type="text"
                name="lims_sample_id"
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                }}
                placeholder="输入 UUID"
              />
            </Box>
            <Box>
              <Typography
                sx={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  mb: 0.5,
                }}
              >
                样本名称
              </Typography>
              <input
                type="text"
                name="sample_name"
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                }}
                placeholder="输入样本名称"
              />
            </Box>
            <Box>
              <Typography
                sx={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  mb: 0.5,
                }}
              >
                检验结果
              </Typography>
              <input
                type="text"
                name="inspection_result"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                }}
                placeholder="可选"
              />
            </Box>
            <Box>
              <Typography
                sx={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  mb: 0.5,
                }}
              >
                备注
              </Typography>
              <input
                type="text"
                name="inspection_notes"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                }}
                placeholder="可选"
              />
            </Box>
            <Box sx={{ gridColumn: "span 2" }}>
              <Button
                type="submit"
                sx={{
                  px: 3,
                  py: 1,
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  borderRadius: 2,
                  "&:hover": { backgroundColor: "#15803d" },
                }}
              >
                创建同步
              </Button>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            backgroundColor: "#ffffff",
            p: 3,
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: "#111827", mb: 2 }}
          >
            📋 同步列表
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    样本名称
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    LIMS ID
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    检验结果
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    状态
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {syncs.map((sync) => (
                  <tr
                    key={sync.id}
                    style={{ borderBottom: "1px solid #e5e7eb" }}
                  >
                    <td style={{ padding: "12px 16px" }}>{sync.sample_name}</td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                      }}
                    >
                      {sync.lims_sample_id.slice(0, 8)}...
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {sync.inspection_result || "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          ...getStatusColor(sync.sync_status),
                        }}
                      >
                        {sync.sync_status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {!sync.synced && (
                        <Button
                          onClick={() => handleSync(sync.id)}
                          sx={{
                            px: 2,
                            py: 0.5,
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            borderRadius: 1,
                            fontSize: "0.875rem",
                            "&:hover": { backgroundColor: "#1d4ed8" },
                          }}
                        >
                          同步
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default IntegrationLimsQmsPage;
