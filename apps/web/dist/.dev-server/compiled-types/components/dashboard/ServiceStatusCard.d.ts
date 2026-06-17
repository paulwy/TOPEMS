import React from "react";
type IconComponent = React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
}>;
interface ServiceStatusCardProps {
    name: string;
    service: string;
    port: number;
    status: boolean;
    icon: IconComponent;
}
export declare const ServiceStatusCard: React.FC<ServiceStatusCardProps>;
export {};
