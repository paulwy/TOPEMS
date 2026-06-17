import React from "react";
interface MobileNavProps {
    currentPage: string;
    onNavigate: (_page: string) => void;
}
declare const MobileNav: React.FC<MobileNavProps>;
export default MobileNav;
