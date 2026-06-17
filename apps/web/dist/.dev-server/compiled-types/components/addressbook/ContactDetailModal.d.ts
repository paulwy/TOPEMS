import type { AddressbookDetail } from "../../types/addressbook";
interface ContactDetailModalProps {
    contact: AddressbookDetail | null;
    onClose: () => void;
}
export declare const ContactDetailModal: React.FC<ContactDetailModalProps>;
export {};
