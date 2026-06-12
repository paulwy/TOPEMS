/**
 * 公司架构管理页面
 * 管理母子公司关系、持股比例、控制类型等，用于合并报表
 */

import React, { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Search,
  Building2,
  Network,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Users,
  GitMerge,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCompanyRelations,
  useCompanyTree,
  useCreateCompanyRelation,
  useUpdateCompanyRelation,
  useDeleteCompanyRelation,
} from "@/hooks/useConsolidation";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";
import type {
  CompanyRelation,
  CompanyTreeNode,
  CompanyRelationType,
} from "@/types/consolidation";

// 关系类型配置
const RELATION_TYPE_CONFIG: Record<
  CompanyRelationType,
  { label: string; color: string }
> = {
  parent: { label: "母公司", color: "bg-blue-100 text-blue-800" },
  subsidiary: { label: "子公司", color: "bg-green-100 text-green-800" },
  associate: { label: "联营公司", color: "bg-orange-100 text-orange-800" },
  joint_venture: { label: "合营公司", color: "bg-purple-100 text-purple-800" },
  branch: { label: "分公司", color: "bg-gray-100 text-gray-800" },
};

// 状态配置
const STATUS_CONFIG = {
  active: {
    label: "生效",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  inactive: {
    label: "失效",
    color: "bg-gray-100 text-gray-800",
    icon: XCircle,
  },
};

// 公司架构树节点组件
const TreeNodeComponent: React.FC<{
  node: CompanyTreeNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}> = ({ node, level, expandedNodes, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 cursor-pointer"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )
        ) : (
          <span className="w-4" />
        )}
        <Building2 className="w-4 h-4 text-blue-600" />
        <span className="font-medium">{node.name}</span>
        <span className="text-gray-400 text-sm">({node.code})</span>
        {node.is_parent && (
          <Badge className="bg-blue-100 text-blue-800">母公司</Badge>
        )}
        <Badge
          className={RELATION_TYPE_CONFIG[node.relation_type || ""]?.color}
        >
          {RELATION_TYPE_CONFIG[node.relation_type || ""]?.label}
        </Badge>
        <span className="text-gray-500 text-sm">
          持股 {node.ownership_percentage}%
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function CompanyStructurePage() {
  // 状态
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedRelation, setSelectedRelation] =
    useState<CompanyRelation | null>(null);
  const [activeTab, setActiveTab] = useState("tree");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 查询公司关系列表
  const { data: relationsData, isLoading: relationsLoading } =
    useCompanyRelations({
      keyword: searchKeyword,
    });

  // 查询公司架构树
  const { data: treeData, isLoading: treeLoading } = useCompanyTree();

  // 创建公司关系
  const createRelation = useCreateCompanyRelation();

  // 更新公司关系
  const updateRelation = useUpdateCompanyRelation();

  // 删除公司关系
  const deleteRelation = useDeleteCompanyRelation();

  // 处理展开/折叠
  const handleToggle = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 处理选择关系
  const handleSelectRelation = (relation: CompanyRelation) => {
    setSelectedRelation(relation);
  };

  // 处理删除关系
  const handleDeleteRelation = async (relationId: string) => {
    if (window.confirm("确定要删除此公司关系吗？")) {
      deleteRelation.mutate(relationId);
    }
  };

  // 关系列表列定义
  const relationColumns: ColumnDef<CompanyRelation>[] = [
    {
      id: "parent_company",
      header: "母公司",
      accessorKey: "parent_company_name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span className="font-medium">
            {row.original.parent_company_name}
          </span>
          <span className="text-gray-400 text-sm">
            ({row.original.parent_company_code})
          </span>
        </div>
      ),
    },
    {
      id: "relation_type",
      header: "关系类型",
      accessorKey: "relation_type",
      cell: ({ row }) => {
        const relationType = row.getValue<string>("relation_type");
        const config = RELATION_TYPE_CONFIG[
          relationType as keyof typeof RELATION_TYPE_CONFIG
        ] || {
          label: relationType,
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "child_company",
      header: "子公司",
      accessorKey: "child_company_name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-green-600" />
          <span className="font-medium">{row.original.child_company_name}</span>
          <span className="text-gray-400 text-sm">
            ({row.original.child_company_code})
          </span>
        </div>
      ),
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
      id: "control_percentage",
      header: "控制比例",
      accessorKey: "control_percentage",
      cell: ({ row }) => (
        <span className="font-mono">{row.getValue("control_percentage")}%</span>
      ),
    },
    {
      id: "effective_date",
      header: "生效日期",
      accessorKey: "effective_date",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("effective_date")}</span>
      ),
    },
    {
      id: "status",
      header: "状态",
      accessorKey: "status",
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
          label: status,
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteRelation(row.original.id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-600" />
            公司架构管理
          </h1>
          <p className="text-gray-500 mt-1">
            管理母子公司关系，用于多公司合并报表
          </p>
        </div>
        <Button onClick={() => navigate("/finance/company-structure/create")}>
          <Plus className="w-4 h-4 mr-2" />
          添加公司关系
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索公司名称或编码..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">高级搜索</Button>
          </div>
        </CardContent>
      </Card>

      {/* 公司架构内容 */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="tree" className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                架构视图
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                关系列表
              </TabsTrigger>
            </TabsList>

            {/* 架构树视图 */}
            <TabsContent value="tree" className="mt-4">
              {treeLoading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : treeData?.data ? (
                <div className="border rounded-lg">
                  <TreeNodeComponent
                    node={treeData.data}
                    level={0}
                    expandedNodes={expandedNodes}
                    onToggle={handleToggle}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无公司架构数据
                </div>
              )}
            </TabsContent>

            {/* 关系列表视图 */}
            <TabsContent value="list" className="mt-4">
              <EnhancedDataTable
                columns={relationColumns}
                data={relationsData?.data || []}
                loading={relationsLoading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 统计信息 */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(RELATION_TYPE_CONFIG).map(([key, config]) => {
          const count =
            relationsData?.data?.filter((r) => r.relation_type === key)
              .length || 0;
          return (
            <Card key={key} className="cursor-pointer hover:border-blue-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{config.label}</p>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </div>
                  <div className={`p-3 rounded-full ${config.color}`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 提示信息 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">使用提示</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• 公司架构用于多公司合并报表的抵消计算</li>
                <li>• 持股比例决定少数股东权益和归属母公司净利润的计算</li>
                <li>• 联营公司和合营公司采用权益法核算</li>
                <li>• 添加公司关系后可到合并范围管理中配置抵消规则</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
