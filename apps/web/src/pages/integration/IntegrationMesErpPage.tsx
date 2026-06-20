import React, { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { integrationApi } from "@/api/integration";
import type { MesErpSync, CreateMesErpSyncRequest } from "@/api/integration";
import { logger } from "@/utils/logger";

const IntegrationMesErpPage: React.FC = () => {
  const [syncs, setSyncs] = useState<MesErpSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await integrationApi.listMesErpSyncs();
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
      const data: CreateMesErpSyncRequest = {
        mes_order_id: formData.get("mes_order_id") as string,
        order_number: formData.get("order_number") as string,
        product_name: (formData.get("product_name") as string) || undefined,
        quantity: formData.get("quantity")
          ? parseFloat(formData.get("quantity") as string)
          : undefined,
      };
      await integrationApi.createMesErpSync(data);
      showToast("MES-ERP sync created successfully");
      e.currentTarget.reset();
      loadData();
    } catch (error) {
      logger.error("Error creating sync:", error);
      showToast("Failed to create sync");
    }
  };

  const handleSync = async (id: string) => {
    try {
      await integrationApi.syncMesErp(id);
      showToast("MES-ERP sync completed");
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
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "#111827", mb: 3 }}
        >
          🏭 MES ↔ ERP 同步
        </Typography>

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
            ➕ 创建 MES ↔ ERP 同步
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
                MES 订单 ID
              </Typography>
              <input
                type="text"
                name="mes_order_id"
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
                订单号
              </Typography>
              <input
                type="text"
                name="order_number"
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                }}
                placeholder="输入订单号"
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
                产品名称
              </Typography>
              <input
                type="text"
                name="product_name"
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
                数量
              </Typography>
              <input
                type="number"
                name="quantity"
                step="0.01"
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
                    订单号
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    产品
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    数量
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
                    <td style={{ padding: "12px 16px" }}>
                      {sync.order_number}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {sync.product_name || "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {sync.quantity || "-"}
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

export default IntegrationMesErpPage;
