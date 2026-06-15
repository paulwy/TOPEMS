import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import type { Contract } from "../api/pm";
import { pmApi } from "../api/pm";

const CONTRACT_TYPES = [
  { value: "", label: "全部类型" },
  { value: "construction", label: "工程合同" },
  { value: "service", label: "服务合同" },
  { value: "purchase", label: "采购合同" },
  { value: "sales", label: "销售合同" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "pending", label: "待审批" },
  { value: "approved", label: "已批准" },
  { value: "active", label: "执行中" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

const PmContractListPage: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    loadContracts();
  }, [selectedType, selectedStatus]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await pmApi.contracts.list();
      if (response.success && response.data) {
        const filtered = response.data.filter((c: Contract) => {
          const typeMatch = !selectedType || c.contract_type === selectedType;
          const statusMatch = !selectedStatus || c.status === selectedStatus;
          return typeMatch && statusMatch;
        });
        setContracts(filtered);
      }
    } catch (error) {
      console.error("Failed to load contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusSx = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return { bgcolor: "success.light", color: "success.dark" };
      case "completed":
        return { bgcolor: "info.light", color: "info.dark" };
      case "pending":
        return { bgcolor: "warning.light", color: "warning.dark" };
      case "approved":
        return { bgcolor: "#e9d5ff", color: "#6b21a8" };
      case "cancelled":
        return { bgcolor: "grey.200", color: "grey.800" };
      case "draft":
        return { bgcolor: "grey.200", color: "grey.600" };
      default:
        return { bgcolor: "grey.200", color: "grey.800" };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "执行中";
      case "completed":
        return "已完成";
      case "pending":
        return "待审批";
      case "approved":
        return "已批准";
      case "cancelled":
        return "已取消";
      case "draft":
        return "草稿";
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    const found = CONTRACT_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const filteredContracts = contracts.filter(
    (contract) =>
      contract.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Box sx={{ p: 3, bgcolor: "grey.50", minHeight: "100vh" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "grey.900" }}>
          合同管理
        </Typography>
        <Typography sx={{ color: "grey.500", mt: 1 }}>
          管理项目相关的合同，跟踪合同执行状态
        </Typography>
      </Box>

      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 1,
          p: 3,
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { md: "center" },
            justifyContent: { md: "space-between" },
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ position: "relative" }}>
              <Search
                size={20}
                color="#9ca3af"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="text"
                placeholder="搜索合同名称或编号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: 40,
                  paddingRight: 16,
                  paddingTop: 8,
                  paddingBottom: 8,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  outline: "none",
                }}
              />
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 8,
                paddingBottom: 8,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                outline: "none",
              }}
            >
              {CONTRACT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 8,
                paddingBottom: 8,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                outline: "none",
              }}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => navigate("/pm/contracts/create")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 8,
                paddingBottom: 8,
                backgroundColor: "#2563eb",
                color: "white",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus size={20} />
              创建合同
            </button>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                合同总数
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "grey.900" }}
              >
                {contracts.length}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: "#dbeafe", borderRadius: "50%" }}>
              <FileText size={24} color="#2563eb" />
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                执行中
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "success.dark" }}
              >
                {contracts.filter((c) => c.status === "active").length}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: "success.light", borderRadius: "50%" }}>
              <CheckCircle size={24} color="#16a34a" />
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                待审批
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "warning.dark" }}
              >
                {contracts.filter((c) => c.status === "pending").length}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: "warning.light", borderRadius: "50%" }}>
              <AlertCircle size={24} color="#ca8a04" />
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                合同总金额
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "#7e22ce" }}
              >
                {formatCurrency(
                  contracts.reduce((sum, c) => sum + (c.amount || 0), 0),
                )}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: "#e9d5ff", borderRadius: "50%" }}>
              <DollarSign size={24} color="#7e22ce" />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%" }}>
            <Box component="thead" sx={{ bgcolor: "grey.50" }}>
              <Box component="tr">
                <Box
                  component="th"
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "grey.500",
                    textTransform: "uppercase",
                  }}
                >
                  合同名称
                </Box>
                <Box
                  component="th"
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "grey.500",
                    textTransform: "uppercase",
                  }}
                >
                  类型
                </Box>
                <Box
                  component="th"
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "grey.500",
                    textTransform: "uppercase",
                  }}
                >
                  乙方
                </Box>
                <Box
                  component="th"
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "grey.500",
                    textTransform: "uppercase",
                  }}
                >
                  金额
                </Box>
                <Box
                  component="th"
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "grey.500",
                    textTransform: "uppercase",
                  }}
                >
                  状态
                </Box>
                <Box
                  component="th"
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "grey.500",
                    textTransform: "uppercase",
                  }}
                >
                  时间
                </Box>
                <Box
                  component="th"
                  sx={{
                    px: 3,
                    py: 1.5,
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "grey.500",
                    textTransform: "uppercase",
                  }}
                >
                  操作
                </Box>
              </Box>
            </Box>
            <Box component="tbody">
              {loading ? (
                <Box component="tr">
                  <Box
                    component="td"
                    colSpan={7}
                    sx={{ px: 3, py: 6, textAlign: "center" }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        border: "2px solid #2563eb",
                        borderTopColor: "transparent",
                        animation: "spin 1s linear infinite",
                        mx: "auto",
                        "@keyframes spin": {
                          to: { transform: "rotate(360deg)" },
                        },
                      }}
                    />
                  </Box>
                </Box>
              ) : filteredContracts.length === 0 ? (
                <Box component="tr">
                  <Box
                    component="td"
                    colSpan={7}
                    sx={{
                      px: 3,
                      py: 6,
                      textAlign: "center",
                      color: "grey.500",
                    }}
                  >
                    暂无合同数据
                  </Box>
                </Box>
              ) : (
                filteredContracts.map((contract) => (
                  <Box
                    component="tr"
                    key={contract.id}
                    sx={{
                      "&:hover": { bgcolor: "grey.50" },
                    }}
                  >
                    <Box component="td" sx={{ px: 3, py: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 500, color: "grey.900" }}>
                          {contract.contract_name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "grey.500" }}
                        >
                          {contract.contract_code}
                        </Typography>
                      </Box>
                    </Box>
                    <Box component="td" sx={{ px: 3, py: 2 }}>
                      <Typography variant="body2" sx={{ color: "grey.600" }}>
                        {getTypeLabel(contract.contract_type)}
                      </Typography>
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        px: 3,
                        py: 2,
                        fontSize: "0.875rem",
                        color: "grey.600",
                      }}
                    >
                      {contract.party_b_name || "-"}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        px: 3,
                        py: 2,
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "grey.900",
                      }}
                    >
                      {formatCurrency(contract.amount)}
                    </Box>
                    <Box component="td" sx={{ px: 3, py: 2 }}>
                      <Box
                        component="span"
                        sx={{
                          px: 1,
                          py: 0.5,
                          fontSize: "0.75rem",
                          borderRadius: "9999px",
                          display: "inline-block",
                          ...getStatusSx(contract.status || ""),
                        }}
                      >
                        {getStatusLabel(contract.status || "")}
                      </Box>
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        px: 3,
                        py: 2,
                        fontSize: "0.875rem",
                        color: "grey.600",
                      }}
                    >
                      <Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Calendar size={16} color="#9ca3af" />
                          {formatDate(contract.signing_date)}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{ color: "grey.400" }}
                        >
                          至 {formatDate(contract.end_date)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box component="td" sx={{ px: 3, py: 2 }}>
                      <button
                        onClick={() => navigate(`/pm/contracts/${contract.id}`)}
                        style={{
                          color: "#2563eb",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                        }}
                      >
                        查看详情
                      </button>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PmContractListPage;
