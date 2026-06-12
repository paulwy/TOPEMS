import React, { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import type { ProjectTemplate } from "../components/pm/ProjectTemplateCard";
import ProjectTemplateCard from "../components/pm/ProjectTemplateCard";
import ProjectTemplateModal from "../components/pm/ProjectTemplateModal";
import { pmApi } from "../api/pm";
import type { CreateProjectRequest } from "../api/pm";

const PmTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const templates: ProjectTemplate[] = [
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

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.project_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

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
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">项目模板</h1>
            <p className="text-gray-500 mt-1">
              选择模板快速创建项目，提高工作效率
            </p>
          </div>
          <Button onClick={() => navigate("/pm/projects/create")}>
            <Plus className="w-4 h-4 mr-2" />
            新建项目
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索模板名称、类型或标签..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <ProjectTemplateCard
              key={template.id}
              template={template}
              onSelect={handleSelectTemplate}
            />
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">未找到匹配的模板</p>
            </CardContent>
          </Card>
        )}

        <ProjectTemplateModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          template={selectedTemplate}
          onConfirm={handleCreateProject}
        />
      </div>
    </div>
  );
};

export default PmTemplatePage;
