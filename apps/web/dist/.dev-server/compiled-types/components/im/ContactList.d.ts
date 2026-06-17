import React from "react";
import type { Friend } from "../../api/im";
interface ContactListProps {
    onSelectContact?: (friend: Friend) => void;
}
export declare const ContactList: React.FC<ContactListProps>;
export {};
