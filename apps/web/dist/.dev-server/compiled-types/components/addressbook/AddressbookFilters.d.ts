import React from "react";
interface AddressbookFiltersProps {
    statusFilter: string;
    onStatusChange: (_status: string) => void;
}
export declare const AddressbookFilters: React.FC<AddressbookFiltersProps>;
export {};
