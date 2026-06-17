import React from "react";
import type { PmStatistics, ProjectBenefit } from "@/api/pm";
interface ProjectReportProps {
    stats: PmStatistics;
    benefits: ProjectBenefit[];
}
declare const ProjectReport: React.FC<ProjectReportProps>;
export default ProjectReport;
