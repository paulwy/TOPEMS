import React from "react";
interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    currentPage: string;
    onNavigate: (path: string) => void;
}
export declare const MobileMenu: React.FC<MobileMenuProps>;
export {};
