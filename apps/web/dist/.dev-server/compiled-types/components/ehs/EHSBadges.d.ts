import React from "react";
export type HazardStatus = "active" | "controlled" | "eliminated" | "archived" | "活动中" | "已控制" | "已消除" | "已归档";
export type IncidentStatus = "pending" | "investigating" | "resolved" | "closed" | "待处理" | "调查中" | "已解决" | "已关闭";
export type ControlStatus = "pending" | "in_progress" | "completed" | "verified" | "待处理" | "进行中" | "已完成" | "已验证";
interface EHSStatusBadgeProps {
    status: HazardStatus | IncidentStatus | ControlStatus | string;
    type?: "hazard" | "incident" | "control";
    className?: string;
}
export declare const EHSStatusBadge: React.FC<EHSStatusBadgeProps>;
export type SeverityLevel = "high" | "medium" | "low" | "fatal" | "serious" | "minor" | "near_miss" | "高" | "中" | "低" | "致命" | "严重" | "轻微" | "未遂";
interface EHSSeverityBadgeProps {
    severity: SeverityLevel | string;
    className?: string;
}
export declare const EHSSeverityBadge: React.FC<EHSSeverityBadgeProps>;
export type RiskLevel = "high" | "medium" | "low" | "高" | "中" | "低";
interface EHSRiskLevelBadgeProps {
    level: RiskLevel | string;
    showLabel?: boolean;
    className?: string;
}
export declare const EHSRiskLevelBadge: React.FC<EHSRiskLevelBadgeProps>;
export type MeasureType = "engineering" | "administrative" | "ppe" | "工程控制" | "管理控制" | "个人防护";
interface EHSMeasureTypeBadgeProps {
    type: MeasureType | string;
    className?: string;
}
export declare const EHSMeasureTypeBadge: React.FC<EHSMeasureTypeBadgeProps>;
export type IncidentType = "near_miss" | "accident" | "injury" | "environmental" | "equipment" | "未遂事件" | "事故" | "人员伤害" | "环境事件" | "设备故障";
interface EHSIncidentTypeBadgeProps {
    type: IncidentType | string;
    className?: string;
}
export declare const EHSIncidentTypeBadge: React.FC<EHSIncidentTypeBadgeProps>;
export {};
