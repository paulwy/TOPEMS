/**
 * 凭证模板管理页面
 * 管理凭证自动生成规则和模板
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Copy,
  Settings,
  FileText,
  ArrowUpDown,
  MoreHorizontal,
  Check,
  X,
  Play,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const createTemplate = useCreateVoucherTemplate();
  const deleteTemplate = useDeleteVoucherTemplate();
  const copyTemplate = useCopyVoucherTemplate();
  const toggleTemplate = useToggleVoucherTemplate();
  const autoGenerate = useAutoGenerateVouchers();

  // 状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterType, setFilterType] = useState<VoucherTemplateType | "">("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

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
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">凭证模板管理</h1>
          <p className="text-gray-500 mt-1">管理凭证自动生成规则和模板配置</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建模板
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="搜索模板名称或编码..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as VoucherTemplateType | "")
          }
          className="p-2 border rounded-lg"
        >
          <option value="">全部类型</option>
          {Object.entries(TEMPLATE_TYPE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* 模板列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500">暂无凭证模板</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowCreateModal(true)}
            >
              创建第一个模板
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template: any) => {
            const typeConfig = TEMPLATE_TYPE_CONFIG[
              template.type as VoucherTemplateType
            ] || {
              label: template.type,
              color: "bg-gray-100 text-gray-800",
            };

            return (
              <Card key={template.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {template.name}
                        </CardTitle>
                        <p className="text-xs text-gray-500 font-mono">
                          {template.code}
                        </p>
                      </div>
                    </div>
                    <Badge className={typeConfig.color}>
                      {typeConfig.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* 描述 */}
                  {template.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* 信息 */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">分录数</span>
                      <span>{template.entries?.length || 0} 条</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">适用模块</span>
                      <span>
                        {template.applicable_modules?.join(", ") || "全部"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">状态</span>
                      <Badge
                        variant={template.is_active ? "default" : "secondary"}
                      >
                        {template.is_active ? "启用" : "禁用"}
                      </Badge>
                    </div>
                    {template.is_default && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">默认模板</span>
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCopy(template)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      复制
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(template)}
                    >
                      {template.is_active ? (
                        <X className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* 快速操作 */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      autoGenerate.mutate({
                        template_id: template.id,
                        period: new Date().toISOString().slice(0, 7),
                      })
                    }
                  >
                    <Play className="w-4 h-4 mr-2" />
                    试算生成
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 生成规则入口 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">凭证自动生成规则</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            配置业务单据自动生成凭证的规则，例如：项目结算自动生成收入凭证、工资计算自动生成工资凭证等。
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/finance/voucher-rules")}
          >
            <Settings className="w-4 h-4 mr-2" />
            管理生成规则
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
