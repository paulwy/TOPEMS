import React from "react";
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
declare const ProjectTemplateCard: React.FC<ProjectTemplateCardProps>;
export default ProjectTemplateCard;
