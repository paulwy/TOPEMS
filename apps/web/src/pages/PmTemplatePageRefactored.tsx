/**
 * PmTemplatePage 重构
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 或 CardGrid 布局
 * 4. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  useTheme,
} from "@mui/material";
import { Plus, Search } from "lucide-react";
import type { ProjectTemplate } from "../components/pm/ProjectTemplateCard";
import ProjectTemplateCard from "../components/pm/ProjectTemplateCard";
import ProjectTemplateModal from "../components/pm/ProjectTemplateModal";
import { pmApi } from "../api/pm";
import type { CreateProjectRequest } from "../api/pm";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 模板数据 ============
const TEMPLATES: ProjectTemplate[] = [
  {
    id: "1",
    name: "研发项目模板",
    description:
      "适用于软件研发、产品开发等技术类项目，包含需求分析、设计、开发、测试、上线等阶段",
    project_type: "research",
    icon: "code",
    phases_count: 5,
    estimated_days: 90,
    default_budget: 500000,
    tags: ["研发", "技术", "敏捷"],
  },
  {
    id: "2",
    name: "施工项目模板",
    description:
      "适用于建筑施工、基础设施建设等工程项目，包含规划、设计、施工、验收等阶段",
    project_type: "construction",
    icon: "building",
    phases_count: 6,
    estimated_days: 180,
    default_budget: 2000000,
    tags: ["施工", "建筑", "工程"],
  },
  {
    id: "3",
    name: "设计项目模板",
    description:
      "适用于产品设计、UI设计、品牌设计等创意项目，包含调研、概念设计、方案确认等阶段",
    project_type: "design",
    icon: "palette",
    phases_count: 4,
    estimated_days: 45,
    default_budget: 100000,
    tags: ["设计", "创意", "品牌"],
  },
  {
    id: "4",
    name: "市场推广模板",
    description:
      "适用于市场活动、营销推广、品牌宣传等项目，包含策划、执行、监测、评估等阶段",
    project_type: "service",
    icon: "trending-up",
    phases_count: 4,
    estimated_days: 30,
    default_budget: 80000,
    tags: ["市场", "营销", "推广"],
  },
  {
    id: "5",
    name: "生产项目模板",
    description:
      "适用于产品生产、批量制造等项目，包含工艺设计、采购、生产、质检等阶段",
    project_type: "production",
    icon: "factory",
    phases_count: 5,
    estimated_days: 120,
    default_budget: 800000,
    tags: ["生产", "制造", "工艺"],
  },
  {
    id: "6",
    name: "培训项目模板",
    description:
      "适用于员工培训、技能提升、知识普及等项目，包含需求分析、课程设计、实施评估等阶段",
    project_type: "service",
    icon: "graduation-cap",
    phases_count: 4,
    estimated_days: 60,
    default_budget: 50000,
    tags: ["培训", "教育", "学习"],
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索模板名称、类型或标签...",
  },
];

// ============ 组件 ============
const PmTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchText, setSearchText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredTemplates = TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(searchText.toLowerCase()) ||
      template.project_type.toLowerCase().includes(searchText.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchText.toLowerCase()),
      ),
  );

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    if (filterId === "search") {
      setSearchText(value);
    }
  }, []);

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleCreateProject = async (data: CreateProjectRequest) => {
    setLoading(true);
    try {
      const response = await pmApi.projects.create(data);
      if (response.success) {
        navigate("/pm/projects");
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="项目模板"
        subtitle="选择模板快速创建项目，提高工作效率"
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={() => navigate("/pm/projects/create")}
          >
            新建项目
          </Button>
        }
      />

      <Box sx={{ p: 3 }}>
        {/* 筛选器 */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <FilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </CardContent>
        </Card>

        {/* 模板卡片列表 */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent sx={{ p: 12, textAlign: "center" }}>
              <Box sx={{ color: "grey.500" }}>
                未找到匹配的模板
              </Box>
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
            {filteredTemplates.map((template) => (
              <ProjectTemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelectTemplate}
              />
            ))}
          </Box>
        )}

        {/* 模板详情模态框 */}
        <ProjectTemplateModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          template={selectedTemplate}
          onConfirm={handleCreateProject}
        />
      </Box>
    </>
  );
};

export default PmTemplatePage;
