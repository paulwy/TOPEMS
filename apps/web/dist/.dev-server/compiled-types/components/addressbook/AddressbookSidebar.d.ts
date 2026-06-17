import React from "react";
import type { DepartmentNode } from "../../types/addressbook";
interface AddressbookSidebarProps {
    departments: DepartmentNode[];
    selectedType: "all" | "EMPLOYEE" | "DEPARTMENT" | "COMPANY";
    onTypeSelect: (_type: "all" | "EMPLOYEE" | "DEPARTMENT" | "COMPANY") => void;
    selectedDepartment: string | null;
    onDepartmentSelect: (_id: string | null) => void;
}
export declare const AddressbookSidebar: React.FC<AddressbookSidebarProps>;
export {};
