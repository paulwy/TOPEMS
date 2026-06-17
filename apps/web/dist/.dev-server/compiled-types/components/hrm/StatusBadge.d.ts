import React from "react";
export type StatusCategory = "employee" | "attendance" | "leave" | "payroll" | "performance";
interface StatusBadgeProps {
    status: string;
    category?: StatusCategory;
    variant?: "default" | "secondary" | "destructive" | "outline";
    showIcon?: boolean;
}
export declare const StatusBadge: React.FC<StatusBadgeProps>;
export { StatusBadge as default };
export declare const AttendanceStatusBadge: React.FC<Omit<StatusBadgeProps, "category">>;
export declare const LeaveStatusBadge: React.FC<Omit<StatusBadgeProps, "category">>;
