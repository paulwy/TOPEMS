import React from "react";
interface MobileHeaderProps {
    title: string;
    onMenuClick?: () => void;
    hasNotifications?: boolean;
}
declare const MobileHeader: React.FC<MobileHeaderProps>;
export default MobileHeader;
