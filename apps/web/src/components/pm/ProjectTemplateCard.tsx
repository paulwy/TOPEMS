import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { FileText, Clock, Tag, ArrowRight } from "lucide-react";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  project_type: string;
  icon: string;
  phases_count: number;
  estimated_days: number;
  default_budget: number;
  tags: string[];
}

interface ProjectTemplateCardProps {
  template: ProjectTemplate;
  onSelect: (template: ProjectTemplate) => void;
}

const ProjectTemplateCard: React.FC<ProjectTemplateCardProps> = ({
  template,
  onSelect,
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <p className="text-sm text-gray-500">{template.project_type}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 line-clamp-2">
          {template.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{template.estimated_days}天</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>{template.phases_count}个阶段</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>

        <Button
          variant="ghost"
          className="w-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors gap-2"
          onClick={() => onSelect(template)}
        >
          使用模板
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjectTemplateCard;
