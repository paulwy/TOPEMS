/**
 * 合并范围管理页面
 * 管理多公司合并报表的合并范围配置
 */

import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        return <Badge className={config.color}>{config.label}</Badge>;
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
            <Badge className={config.color}>{config.label}</Badge>
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
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/finance/consolidation/${row.id}/rules`)}
          >
            <Settings className="w-4 h-4" />
            规则
          </Button>
          <Button
            variant="ghost"
            size="sm"
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
            <Badge className="bg-blue-100 text-blue-800">母公司</Badge>
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
        return <Badge className={config.color}>{config.label}</Badge>;
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
          variant="ghost"
          size="sm"
          onClick={() => removeCompany.mutate(row.original.id)}
          disabled={row.original.is_parent}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitMerge className="w-6 h-6 text-blue-600" />
            合并范围管理
          </h1>
          <p className="text-gray-500 mt-1">
            配置多公司合并报表的合并范围和抵消规则
          </p>
        </div>
        <Button
          onClick={() => navigate("/finance/consolidation/scopes/create")}
        >
          <Plus className="w-4 h-4 mr-2" />
          新建合并范围
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索合并范围名称或编码..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">高级搜索</Button>
          </div>
        </CardContent>
      </Card>

      {/* 合并范围列表和详情 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：合并范围列表 */}
        <div className="col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="w-5 h-5 text-blue-600" />
                合并范围列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scopesLoading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : scopesData?.items?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无合并范围，点击右上角新建
                </div>
              ) : (
                <div className="space-y-2">
                  {scopesData?.items?.map((scope) => (
                    <div
                      key={scope.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedScope?.id === scope.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() => handleSelectScope(scope)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{scope.name}</span>
                            {STATUS_CONFIG[scope.status] && (
                              <Badge
                                className={STATUS_CONFIG[scope.status].color}
                              >
                                {STATUS_CONFIG[scope.status].label}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {scope.code} |{" "}
                            {METHOD_CONFIG[scope.consolidation_method]?.label ||
                              scope.consolidation_method}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：合并范围详情 */}
        <div className="col-span-7">
          {selectedScope ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    {selectedScope.name}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/finance/consolidation/scopes/${selectedScope.id}/edit`,
                      )
                    }
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    编辑
                  </Button>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  {selectedScope.code} | {selectedScope.description || "无说明"}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="companies">
                      成员公司 ({companiesData?.data?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="rules">抵消规则</TabsTrigger>
                    <TabsTrigger value="transactions">内部交易</TabsTrigger>
                  </TabsList>

                  <TabsContent value="companies" className="mt-4">
                    <div className="mb-4 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/finance/consolidation/scopes/${selectedScope.id}/add-company`,
                          )
                        }
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        添加公司
                      </Button>
                    </div>

                    {companiesLoading ? (
                      <div className="text-center py-8 text-gray-500">
                        加载中...
                      </div>
                    ) : companiesData?.data?.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        暂无成员公司
                      </div>
                    ) : (
                      <EnhancedDataTable
                        columns={companyColumns}
                        data={companiesData?.data || []}
                        loading={companiesLoading}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="rules" className="mt-4">
                    <div className="mb-4 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/finance/consolidation/scopes/${selectedScope.id}/rules/create`,
                          )
                        }
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        新建规则
                      </Button>
                    </div>
                    <div className="text-center py-8 text-gray-500">
                      点击上方按钮添加抵消规则
                    </div>
                  </TabsContent>

                  <TabsContent value="transactions" className="mt-4">
                    <div className="text-center py-8 text-gray-500">
                      内部交易列表将显示在此处
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <Network className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>请从左侧选择一个合并范围</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
