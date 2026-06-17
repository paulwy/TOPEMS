import type { AddressbookEntry } from "../../types/addressbook";
interface ContactCardProps {
    contact: AddressbookEntry;
    onClick: () => void;
}
export declare const ContactCard: React.FC<ContactCardProps>;
export {};
