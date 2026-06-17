import React from "react";
import type { GanttPhase, GanttMilestone } from "@/api/pm";
interface GanttChartProps {
    phases: GanttPhase[];
    milestones: GanttMilestone[];
    projectStartDate?: string;
    projectEndDate?: string;
}
declare const GanttChart: React.FC<GanttChartProps>;
export default GanttChart;
