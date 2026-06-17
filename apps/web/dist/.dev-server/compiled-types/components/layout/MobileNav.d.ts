import React from "react";
import type { NavItem } from "../../config/navigation";
interface MobileNavProps {
    navItems: NavItem[];
    open: boolean;
    onClose: () => void;
    onOpen: () => void;
}
export declare const MobileNav: React.FC<MobileNavProps>;
export default MobileNav;
