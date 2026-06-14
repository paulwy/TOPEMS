/**
 * 合并范围管理页面
 * 管理多公司合并报表的合并范围配置
 */

import React, { useState } from "react";
import { Button, Card, CardContent, CardHeader, Chip, Typography, TextField, Box, Tabs, Tab } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Search,
  Building2,
  Users,
  Settings,
  Edit2,
  Trash2,
  ChevronRight,
  Network,
  GitMerge,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  useConsolidationScopes,
  useDeleteConsolidationScope,
  useScopeCompanies,
  useAddCompanyToScope,
  useRemoveCompanyFromScope,
} from "@/hooks/useConsolidation";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";
import type {
  ConsolidationScope,
  ConsolidationCompany,
} from "@/types/consolidation";

// 状态配置
const STATUS_CONFIG = {
  active: {
    label: "启用",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  inactive: {
    label: "停用",
    color: "bg-gray-100 text-gray-800",
    icon: XCircle,
  },
  draft: {
    label: "草稿",
    color: "bg-yellow-100 text-yellow-800",
    icon: AlertCircle,
  },
};

// 合并方法配置
const METHOD_CONFIG = {
  full: { label: "完全合并", color: "bg-blue-100 text-blue-800" },
  equity: { label: "权益法", color: "bg-purple-100 text-purple-800" },
  proportional: { label: "比例合并", color: "bg-teal-100 text-teal-800" },
};

// 控制类型配置
const CONTROL_TYPE_CONFIG = {
  full_control: { label: "全资子公司", color: "bg-blue-100 text-blue-800" },
  joint_venture: { label: "合资公司", color: "bg-purple-100 text-purple-800" },
  associate: { label: "联营公司", color: "bg-orange-100 text-orange-800" },
};

export default function ConsolidationScopePage() {
  const navigate = useNavigate();

  // 状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedScope, setSelectedScope] = useState<ConsolidationScope | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("companies");

  // 查询合并范围列表
  const { data: scopesData, isLoading: scopesLoading } = useConsolidationScopes(
    {
      keyword: searchKeyword,
    },
  );

  // 删除合并范围
  const deleteScope = useDeleteConsolidationScope();

  // 查询选中合并范围的公司列表
  const { data: companiesData, isLoading: companiesLoading } =
    useScopeCompanies(selectedScope?.id || "");

  // 添加公司到合并范围
  const addCompany = useAddCompanyToScope();

  // 从合并范围移除公司
  const removeCompany = useRemoveCompanyFromScope();

  // 处理选择合并范围
  const handleSelectScope = (scope: ConsolidationScope) => {
    setSelectedScope(scope);
  };

  // 处理删除合并范围
  const handleDeleteScope = async (scopeId: string) => {
    if (window.confirm("确定要删除此合并范围吗？")) {
      deleteScope.mutate(scopeId);
    }
  };

  // 合并范围列定义
  const scopeColumns = [
    {
      id: "code",
      header: "合并范围编码",
      accessorKey: "code",
      cell: ({ row }: { row: ConsolidationScope }) => (
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-600" />
          <span className="font-mono text-sm">{row.code}</span>
        </div>
      ),
    },
    {
      id: "name",
      header: "合并范围名称",
      accessorKey: "name",
      cell: ({ row }: { row: ConsolidationScope }) => (
        <div className="font-medium">{row.name}</div>
      ),
    },
    {
      id: "consolidation_method",
      header: "合并方法",
      accessorKey: "consolidation_method",
      cell: ({ row }: { row: ConsolidationScope }) => {
        const config = METHOD_CONFIG[row.consolidation_method] || {
          label: row.consolidation_method,
          color: "bg-gray-100 text-gray-800",
        };
        return <Chip size="small" className={config.color} label={config.label} />;
      },
    },
    {
      id: "description",
      header: "说明",
      accessorKey: "description",
      cell: ({ row }: { row: ConsolidationScope }) => (
        <span className="text-gray-500 text-sm">{row.description || "-"}</span>
      ),
    },
    {
      id: "status",
      header: "状态",
      accessorKey: "status",
      cell: ({ row }: { row: ConsolidationScope }) => {
        const config = STATUS_CONFIG[row.status] || {
          label: row.status,
          color: "bg-gray-100 text-gray-800",
          icon: AlertCircle,
        };
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Chip size="small" className={config.color} label={config.label} />
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }: { row: ConsolidationScope }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="text"
            size="small"
            onClick={() => navigate(`/finance/consolidation/${row.id}/rules`)}
          >
            <Settings className="w-4 h-4" />
            规则
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => handleDeleteScope(row.id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  // 公司列定义
  const companyColumns: ColumnDef<ConsolidationCompany>[] = [
    {
      id: "company_code",
      header: "公司编码",
      accessorKey: "company_code",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-sm">
            {row.getValue("company_code")}
          </span>
        </div>
      ),
    },
    {
      id: "company_name",
      header: "公司名称",
      accessorKey: "company_name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.getValue("company_name")}</span>
          {row.original.is_parent && (
            <Chip  size="small" className="bg-blue-100 text-blue-800" label="母公司" />
          )}
        </div>
      ),
    },
    {
      id: "control_type",
      header: "控制类型",
      accessorKey: "control_type",
      cell: ({ row }) => {
        const controlType = row.getValue<string>("control_type");
        const config = CONTROL_TYPE_CONFIG[
          controlType as keyof typeof CONTROL_TYPE_CONFIG
        ] || {
          label: controlType,
          color: "bg-gray-100 text-gray-800",
        };
        return <Chip size="small" className={config.color} label={config.label} />;
      },
    },
    {
      id: "ownership_percentage",
      header: "持股比例",
      accessorKey: "ownership_percentage",
      cell: ({ row }) => (
        <span className="font-mono">
          {row.getValue("ownership_percentage")}%
        </span>
      ),
    },
    {
      id: "consolidation_percentage",
      header: "合并比例",
      accessorKey: "consolidation_percentage",
      cell: ({ row }) => (
        <span className="font-mono">
          {row.getValue("consolidation_percentage")}%
        </span>
      ),
    },
    {
      id: "minority_interest",
      header: "少数股东权益",
      accessorKey: "minority_interest",
      cell: ({ row }) => (
        <span className="font-mono text-right">
          ¥
          {row.original.minority_interest.toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Button
          variant="text"
          size="small"
          onClick={() => removeCompany.mutate(row.original.id)}
          disabled={row.original.is_parent}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }} className="container mx-auto">
      {/* 页面标题 */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
            <GitMerge className="w-6 h-6 text-blue-600" />
            合并范围管理
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            配置多公司合并报表的合并范围和抵消规则
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => navigate("/finance/consolidation/scopes/create")}
          startIcon={<Plus className="w-4 h-4" />}
        >
          新建合并范围
        </Button>
      </Box>

      {/* 搜索栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ position: "relative", flex: 1, maxWidth: 400 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <TextField
                placeholder="搜索合并范围名称或编码..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                size="small"
                sx={{ pl: 5, width: "100%" }}
              />
            </Box>
            <Button variant="outlined">高级搜索</Button>
          </Box>
        </CardContent>
      </Card>

      {/* 合并范围列表和详情 */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "5fr 7fr" }, gap: 3 }}>
        {/* 左侧：合并范围列表 */}
        <Box>
          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem", display: "flex", alignItems: "center", gap: 1 }}>
                <Network className="w-5 h-5 text-blue-600" />
                合并范围列表
              </Typography>
            </CardHeader>
            <CardContent>
              {scopesLoading ? (
                <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>加载中...</Box>
              ) : scopesData?.items?.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                  暂无合并范围，点击右上角新建
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {scopesData?.items?.map((scope) => (
                    <Box
                      key={scope.id}
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        border: 1,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        borderColor: selectedScope?.id === scope.id ? "primary.main" : "divider",
                        bgcolor: selectedScope?.id === scope.id ? "primary.50" : "transparent",
                        "&:hover": { borderColor: "primary.main", bgcolor: "primary.50" },
                      }}
                      onClick={() => handleSelectScope(scope)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{scope.name}</Typography>
                            {STATUS_CONFIG[scope.status] && (
                              <Chip size="small" label={STATUS_CONFIG[scope.status].label} sx={{ bgcolor: "success.100", color: "success.main" }} />
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                            {scope.code} |{" "}
                            {METHOD_CONFIG[scope.consolidation_method]?.label ||
                              scope.consolidation_method}
                          </Typography>
                        </Box>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* 右侧：合并范围详情 */}
        <Box>
          {selectedScope ? (
            <Card>
              <CardHeader>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem", display: "flex", alignItems: "center", gap: 1 }}>
                    <Users className="w-5 h-5 text-blue-600" />
                    {selectedScope.name}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() =>
                      navigate(
                        `/finance/consolidation/scopes/${selectedScope.id}/edit`,
                      )
                    }
                    startIcon={<Edit2 className="w-4 h-4" />}
                  >
                    编辑
                  </Button>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                  {selectedScope.code} | {selectedScope.description || "无说明"}
                </Typography>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                  <Tab value="companies" label={`成员公司 (${companiesData?.data?.length || 0})`} />
                  <Tab value="rules" label="抵消规则" />
                  <Tab value="transactions" label="内部交易" />
                </Tabs>

                {activeTab === "companies" && (
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() =>
                          navigate(
                            `/finance/consolidation/scopes/${selectedScope.id}/add-company`,
                          )
                        }
                        startIcon={<Plus className="w-4 h-4" />}
                      >
                        添加公司
                      </Button>
                    </Box>

                    {companiesLoading ? (
                      <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                        加载中...
                      </Box>
                    ) : companiesData?.data?.length === 0 ? (
                      <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                        暂无成员公司
                      </Box>
                    ) : (
                      <EnhancedDataTable
                        columns={companyColumns}
                        data={companiesData?.data || []}
                        loading={companiesLoading}
                      />
                    )}
                  </Box>
                )}

                {activeTab === "rules" && (
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() =>
                          navigate(
                            `/finance/consolidation/scopes/${selectedScope.id}/rules/create`,
                          )
                        }
                        startIcon={<Plus className="w-4 h-4" />}
                      >
                        新建规则
                      </Button>
                    </Box>
                    <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                      点击上方按钮添加抵消规则
                    </Box>
                  </Box>
                )}

                {activeTab === "transactions" && (
                  <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                    内部交易列表将显示在此处
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 384 }}>
              <Box sx={{ textAlign: "center", color: "text.secondary" }}>
                <Network className="w-12 h-12 mx-auto mb: 2, text-gray-300" />
                <Typography>请从左侧选择一个合并范围</Typography>
              </Box>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
}
