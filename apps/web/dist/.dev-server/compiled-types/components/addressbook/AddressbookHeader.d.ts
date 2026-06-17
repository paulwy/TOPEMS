interface AddressbookHeaderProps {
    searchQuery: string;
    onSearchChange: (_query: string) => void;
    onExport: () => void;
}
export declare const AddressbookHeader: React.FC<AddressbookHeaderProps>;
export {};
