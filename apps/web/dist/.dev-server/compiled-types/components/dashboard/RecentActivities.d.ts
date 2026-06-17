import React from "react";
export interface ActivityItem {
    id: string;
    title: string;
    type: string;
    time: string;
    icon: React.ReactNode;
}
interface RecentActivitiesProps {
    activities: ActivityItem[];
}
export declare const RecentActivities: React.FC<RecentActivitiesProps>;
export {};
