import React, { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Calendar } from "lucide-react";
import type { ProjectTemplate } from "./ProjectTemplateCard";
import type { CreateProjectRequest } from "../../api/pm";

interface ProjectTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProjectTemplate | null;
  onConfirm: (data: CreateProjectRequest) => void;
}

const ProjectTemplateModal: React.FC<ProjectTemplateModalProps> = ({
  open,
  onOpenChange,
  template,
  onConfirm,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    start_date: "",
    budget: template?.default_budget?.toString() || "",
  });

  React.useEffect(() => {
    if (template) {
      setFormData({
        name: "",
        code: "",
        description: template.description,
        start_date: "",
        budget: template.default_budget?.toString() || "",
      });
    }
  }, [template]);

  const handleSubmit = () => {
    if (!formData.name || !formData.code) return;

    onConfirm({
      name: formData.name,
      code: formData.code,
      description: formData.description,
      project_type: template?.project_type || "general",
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      start_date: formData.start_date || undefined,
    });

    setFormData({
      name: "",
      code: "",
      description: "",
      start_date: "",
      budget: "",
    });
    onOpenChange(false);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>使用模板创建项目</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="template-name">模板名称</Label>
            <Input
              id="template-name"
              value={template.name}
              disabled
              className="mt-1 bg-gray-50"
            />
          </div>

          <div>
            <Label htmlFor="project-name">项目名称 *</Label>
            <Input
              id="project-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="输入项目名称"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="project-code">项目编号 *</Label>
            <Input
              id="project-code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              placeholder="输入项目编号"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="project-description">项目描述</Label>
            <Input
              id="project-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="输入项目描述"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">开始日期</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="budget">预算</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) =>
                  setFormData({ ...formData, budget: e.target.value })
                }
                placeholder="输入预算"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 py-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {template.phases_count}
              </div>
              <div className="text-sm text-gray-500">预设阶段</div>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {template.estimated_days}天
              </div>
              <div className="text-sm text-gray-500">预估周期</div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              创建项目
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectTemplateModal;
