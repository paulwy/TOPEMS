import React from "react";
interface ServiceStatusMonitorProps {
    serviceStatuses: Record<string, boolean>;
    onRefresh: () => void;
}
export declare const ServiceStatusMonitor: React.FC<ServiceStatusMonitorProps>;
export {};
