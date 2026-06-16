import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
/**
 * 凭证模板管理页面
 * 管理凭证自动生成规则和模板
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Copy,
  Settings,
  FileText,
  Check,
  X,
  Play,
} from "lucide-react";
import {
  useVoucherTemplates,
  useCreateVoucherTemplate,
  useDeleteVoucherTemplate,
  useCopyVoucherTemplate,
  useToggleVoucherTemplate,
  useAutoGenerateVouchers,
} from "@/hooks/useVoucherTemplate";
import type { VoucherTemplateType } from "@/types/erp-finance";

// 模板类型配置
const TEMPLATE_TYPE_CONFIG: Record<
  VoucherTemplateType,
  { label: string; color: string }
> = {
  payroll: { label: "工资凭证", color: "bg-purple-100 text-purple-800" },
  sales_invoice: { label: "销售发票", color: "bg-green-100 text-green-800" },
  purchase_invoice: {
    label: "采购发票",
    color: "bg-orange-100 text-orange-800",
  },
  collection: { label: "收款凭证", color: "bg-blue-100 text-blue-800" },
  payment: { label: "付款凭证", color: "bg-red-100 text-red-800" },
  depreciation: { label: "折旧凭证", color: "bg-gray-100 text-gray-800" },
  expense: { label: "费用报销", color: "bg-yellow-100 text-yellow-800" },
  cost_allocation: { label: "成本归集", color: "bg-cyan-100 text-cyan-800" },
};

export default function VoucherTemplatePage() {
  const navigate = useNavigate();

  // 查询模板列表
  const { data: templatesData, isLoading, refetch } = useVoucherTemplates();

  // mutations
  const deleteTemplate = useDeleteVoucherTemplate();
  const copyTemplate = useCopyVoucherTemplate();
  const toggleTemplate = useToggleVoucherTemplate();
  const autoGenerate = useAutoGenerateVouchers();

  // 状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterType, setFilterType] = useState<VoucherTemplateType | "">("");
  const [, setShowCreateModal] = useState(false);
  const [, setEditingTemplate] = useState<any>(null);

  // 筛选模板
  const filteredTemplates = (templatesData?.data?.items || []).filter(
    (tmpl: any) => {
      const matchesSearch =
        !searchKeyword ||
        tmpl.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        tmpl.code.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchesType = !filterType || tmpl.type === filterType;
      return matchesSearch && matchesType;
    },
  );

  // 处理复制
  const handleCopy = async (template: any) => {
    const newCode = `${template.code}_copy_${Date.now()}`;
    const newName = `${template.name} (副本)`;
    try {
      await copyTemplate.mutateAsync({
        templateId: template.id,
        newCode,
        newName,
      });
    } catch (error) {
      console.error("Copy template failed:", error);
    }
  };

  // 处理删除
  const handleDelete = async (templateId: string) => {
    if (!window.confirm("确定要删除此模板吗？")) return;
    try {
      await deleteTemplate.mutateAsync(templateId);
    } catch (error) {
      console.error("Delete template failed:", error);
    }
  };

  // 处理启用/禁用
  const handleToggle = async (template: any) => {
    try {
      await toggleTemplate.mutateAsync({
        templateId: template.id,
        isActive: !template.is_active,
      });
    } catch (error) {
      console.error("Toggle template failed:", error);
    }
  };

  return (
    <Box sx={{ py: 3, maxWidth: "xl", mx: "auto" }}>
      {/* 页面标题 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            凭证模板管理
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            管理凭证自动生成规则和模板配置
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => refetch()}
            startIcon={<RefreshCw sx={{ width: 16, height: 16 }} />}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            onClick={() => setShowCreateModal(true)}
            startIcon={<Plus sx={{ width: 16, height: 16 }} />}
          >
            新建模板
          </Button>
        </Box>
      </Box>

      {/* 筛选栏 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <TextField
          placeholder="搜索模板名称或编码..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          size="small"
          sx={{ maxWidth: 320 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>全部类型</InputLabel>
          <Select
            value={filterType}
            label="全部类型"
            onChange={(e) =>
              setFilterType(e.target.value as VoucherTemplateType | "")
            }
          >
            <MenuItem value="">全部类型</MenuItem>
            {Object.entries(TEMPLATE_TYPE_CONFIG).map(([key, config]) => (
              <MenuItem key={key} value={key}>
                {config.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 模板列表 */}
      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 6,
          }}
        >
          <RefreshCw sx={{ width: 32, height: 32, color: "grey.400", animation: "spin 1s linear infinite" }} />
        </Box>
      ) : filteredTemplates.length === 0 ? (
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 6,
          }}
        >
          <CardContent
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <FileText sx={{ width: 48, height: 48, color: "grey.400", mb: 1 }} />
            <Typography sx={{ color: "text.secondary", mb: 2 }}>
              暂无凭证模板
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setShowCreateModal(true)}
              sx={{ mt: 2 }}
            >
              创建第一个模板
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
            gap: 3,
          }}
        >
          {filteredTemplates.map((template: any) => {
            const typeConfig = TEMPLATE_TYPE_CONFIG[
              template.type as VoucherTemplateType
            ] || {
              label: template.type,
              color: "bg-gray-100 text-gray-800",
            };

            return (
              <Card key={template.id} sx={{ position: "relative" }}>
                <CardHeader sx={{ pb: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: "primary.100",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FileText sx={{ width: 20, height: 20, color: "primary.main" }} />
                      </Box>
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, fontSize: "1rem" }}
                        >
                          {template.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontFamily: "monospace",
                          }}
                        >
                          {template.code}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      size="small"
                      label={typeConfig.label}
                      sx={{ bgcolor: "primary.50", color: "primary.main" }}
                    />
                  </Box>
                </CardHeader>

                <CardContent sx={{ pt: 0 }}>
                  {/* 描述 */}
                  {template.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        mb: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {template.description}
                    </Typography>
                  )}

                  {/* 信息 */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      fontSize: "0.875rem",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        分录数
                      </Typography>
                      <Typography variant="body2">
                        {template.entries?.length || 0} 条
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        适用模块
                      </Typography>
                      <Typography variant="body2">
                        {template.applicable_modules?.join(", ") || "全部"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        状态
                      </Typography>
                      <Chip
                        size="small"
                        variant={template.is_active ? "filled" : "outlined"}
                        label={template.is_active ? "启用" : "禁用"}
                      />
                    </Box>
                    {template.is_default && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary" }}
                        >
                          默认模板
                        </Typography>
                        <Check sx={{ width: 16, height: 16, color: "green.600" }} />
                      </Box>
                    )}
                  </Box>

                  {/* 操作按钮 */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      pt: 2,
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setEditingTemplate(template)}
                      sx={{ flex: 1 }}
                    >
                      <Edit sx={{ width: 16, height: 16, mr: 0.5 }} />
                      编辑
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleCopy(template)}
                      sx={{ flex: 1 }}
                    >
                      <Copy sx={{ width: 16, height: 16, mr: 0.5 }} />
                      复制
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleToggle(template)}
                    >
                      {template.is_active ? (
                        <X sx={{ width: 16, height: 16, color: "grey.500" }} />
                      ) : (
                        <Check sx={{ width: 16, height: 16, color: "green.600" }} />
                      )}
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleDelete(template.id)}
                      sx={{
                        color: "error.main",
                        "&:hover": { bgcolor: "error.50" },
                      }}
                    >
                      <Trash2 sx={{ width: 16, height: 16 }} />
                    </Button>
                  </Box>

                  {/* 快速操作 */}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() =>
                      autoGenerate.mutate({
                        template_id: template.id,
                        period: new Date().toISOString().slice(0, 7),
                      })
                    }
                    sx={{ width: "100%", mt: 2 }}
                    startIcon={<Play sx={{ width: 16, height: 16 }} />}
                  >
                    试算生成
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* 生成规则入口 */}
      <Card sx={{ mt: 3 }}>
        <CardHeader sx={{ pb: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
            凭证自动生成规则
          </Typography>
        </CardHeader>
        <CardContent>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            配置业务单据自动生成凭证的规则，例如：项目结算自动生成收入凭证、工资计算自动生成工资凭证等。
          </Typography>
          <Button
            variant="outlined"
            onClick={() => navigate("/finance/voucher-rules")}
            startIcon={<Settings sx={{ width: 16, height: 16 }} />}
          >
            管理生成规则
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
