import React from "react";
import type { AddressbookEntry } from "../../types/addressbook";
interface AddressbookListProps {
    contacts: AddressbookEntry[];
    loading: boolean;
    onContactClick: (_contact: AddressbookEntry) => void;
}
export declare const AddressbookList: React.FC<AddressbookListProps>;
export {};
