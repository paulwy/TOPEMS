import React from "react";
import type { ProjectTemplate } from "./ProjectTemplateCard";
import type { CreateProjectRequest } from "@/api/pm";
interface ProjectTemplateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template: ProjectTemplate | null;
    onConfirm: (data: CreateProjectRequest) => void;
}
declare const ProjectTemplateModal: React.FC<ProjectTemplateModalProps>;
export default ProjectTemplateModal;
